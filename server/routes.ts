import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./googleAuth";
import { devAuthMiddleware, ensureDevUser } from "./devAuth";
import { insertMatchRequestSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { sendPushNotification } from "./pushNotifications";
import { r2Storage, generateFileKey } from "./services/r2-storage";
import { hmsService, generateRoomName } from "./services/hms-service";
import { verifyFirebaseToken, isPhoneAuthConfigured } from "./services/firebase-admin";
import { sendPhoneCodeSchema, verifyPhoneCodeSchema, phoneRegisterSchema, registerUserSchema } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Development mode flag - bypass authentication when explicitly enabled
const DEV_MODE = process.env.AUTH_DISABLED === "true";

// Choose authentication middleware based on mode
const authMiddleware = DEV_MODE ? devAuthMiddleware : isAuthenticated;

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve service worker and manifest (must be before authentication)
  app.get('/sw.js', (req, res) => {
    const swPath = path.join(__dirname, '../public/sw.js');
    res.type('application/javascript');
    res.sendFile(swPath);
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(__dirname, '../public/manifest.json');
    res.type('application/json');
    res.sendFile(manifestPath);
  });

  app.get('/offline.html', (req, res) => {
    const offlinePath = path.join(__dirname, '../public/offline.html');
    res.type('text/html');
    res.sendFile(offlinePath);
  });

  // Setup authentication (skip in dev mode)
  if (DEV_MODE) {
    console.log("\n🔓 [DEV MODE] Authentication is DISABLED for development");
    console.log("   All routes will use a mock development user");
    console.log("   To enable authentication: Remove AUTH_DISABLED from secrets or set to 'false'\n");
    await ensureDevUser();
  } else {
    console.log("\n🔐 [PRODUCTION MODE] Authentication is ENABLED");
    console.log("   Google OAuth is required for all protected routes\n");
    await setupAuth(app);
  }

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  

  // Phone authentication endpoints (Firebase)
  app.post('/api/auth/phone/verify-token', async (req, res) => {
    try {
      if (!isPhoneAuthConfigured()) {
        return res.status(503).json({ message: "Phone authentication is not configured on the server" });
      }

      const { firebaseToken } = req.body;
      
      if (!firebaseToken) {
        return res.status(400).json({ message: "Firebase token is required" });
      }

      const verifiedUser = await verifyFirebaseToken(firebaseToken);
      
      if (!verifiedUser || !verifiedUser.phoneNumber) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const existingUser = await storage.getUserByPhoneNumber(verifiedUser.phoneNumber);
      
      res.json({ 
        success: true, 
        userExists: !!existingUser,
        phoneNumber: verifiedUser.phoneNumber,
        message: existingUser ? "Phone verified!" : "Phone number verified successfully. Please complete registration." 
      });
    } catch (error) {
      console.error("Error verifying Firebase token:", error);
      res.status(500).json({ message: "Failed to verify token" });
    }
  });

  app.post('/api/auth/phone/register', async (req: any, res) => {
    try {
      const { firebaseToken, ...registrationData } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ message: "Firebase token is required" });
      }

      const verifiedUser = await verifyFirebaseToken(firebaseToken);
      if (!verifiedUser || !verifiedUser.phoneNumber) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const validatedData = registerUserSchema.parse({
        ...registrationData,
        phoneNumber: verifiedUser.phoneNumber,
      });

      const { phoneNumber, gamertag, ...userData } = validatedData;

      if (!phoneNumber || !gamertag) {
        return res.status(400).json({ message: "Phone number and gamertag are required" });
      }

      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);
      if (existingUser) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const existingGamertag = await storage.getUserByGamertag(gamertag);
      if (existingGamertag) {
        return res.status(400).json({ message: "Gamertag already taken" });
      }

      const user = await storage.createPhoneUser({
        phoneNumber,
        gamertag,
        ...userData,
      });

      req.login(user, (err: any) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      } else if ((error as any).code === '23505') {
        res.status(400).json({ message: "Phone number or gamertag already taken" });
      } else {
        console.error("Error registering with phone:", error);
        res.status(500).json({ message: "Failed to register" });
      }
    }
  });

  app.post('/api/auth/phone/login', async (req: any, res) => {
    try {
      const { firebaseToken } = req.body;

      if (!firebaseToken) {
        return res.status(400).json({ message: "Firebase token is required" });
      }

      const verifiedUser = await verifyFirebaseToken(firebaseToken);
      if (!verifiedUser || !verifiedUser.phoneNumber) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const phoneNumber = verifiedUser.phoneNumber;

      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(401).json({ message: "User not found. Please register first." });
      }

      req.login(user, (err: any) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Error logging in with phone:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post('/api/auth/firebase-login', async (req: any, res) => {
    try {
      if (!isPhoneAuthConfigured()) {
        return res.status(503).json({ message: "Firebase authentication is not configured on the server" });
      }

      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }

      const verifiedUser = await verifyFirebaseToken(idToken);
      if (!verifiedUser) {
        return res.status(400).json({ message: "Invalid or expired Firebase token" });
      }

      const { uid, email } = verifiedUser;

      if (!email) {
        return res.status(400).json({ message: "Email is required for Google authentication" });
      }

      let user = await storage.getUserByEmail(email);

      if (!user) {
        user = await storage.upsertUserByGoogleId({
          googleId: uid,
          email: email,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      req.login(user, (err: any) => {
        if (err) {
          console.error("Error logging in with Firebase:", err);
          return res.status(500).json({ message: "Login successful but session creation failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Error authenticating with Firebase:", error);
      res.status(500).json({ message: "Failed to authenticate with Firebase" });
    }
  });

  // User discovery routes
  app.get('/api/users', async (req: any, res) => {
    try {
      const { search, gender, language, game, rank, latitude, longitude, maxDistance, page, limit } = req.query as Record<string, string>;
      const filters: any = { search, gender, language, game, rank };
      
      // Parse location filters
      if (latitude) filters.latitude = parseFloat(latitude);
      if (longitude) filters.longitude = parseFloat(longitude);
      if (maxDistance) filters.maxDistance = parseFloat(maxDistance);
      
      // Parse pagination
      if (page) filters.page = parseInt(page, 10);
      if (limit) filters.limit = parseInt(limit, 10);
      
      // Exclude current user and connected users
      if (req.user?.id) {
        filters.excludeUserId = req.user.id;
        
        // Get all accepted connection requests for this user
        const connectionRequests = await storage.getConnectionRequests(req.user.id);
        const connectedUserIds = connectionRequests
          .filter((request: any) => request.status === 'accepted')
          .map((request: any) => request.senderId === filters.excludeUserId ? request.receiverId : request.senderId);
        
        if (connectedUserIds.length > 0) {
          filters.excludeUserIds = connectedUserIds;
        }
      }
      
      const result = await storage.getAllUsers(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // User count endpoint
  app.get('/api/users/count', async (req, res) => {
    try {
      const count = await storage.getUserCount();
      res.json(count);
    } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ message: "Failed to fetch user count" });
    }
  });

  // Match request routes
  app.get('/api/match-requests', async (req, res) => {
    try {
      const { game, mode, region, gender, language, rank, latitude, longitude, maxDistance, page, limit } = req.query as Record<string, string>;
      const filters: any = { game, mode, region, gender, language, rank };
      
      // Parse location filters
      if (latitude) filters.latitude = parseFloat(latitude);
      if (longitude) filters.longitude = parseFloat(longitude);
      if (maxDistance) filters.maxDistance = parseFloat(maxDistance);
      
      // Parse pagination
      if (page) filters.page = parseInt(page, 10);
      if (limit) filters.limit = parseInt(limit, 10);
      
      const result = await storage.getMatchRequests(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching match requests:", error);
      res.status(500).json({ message: "Failed to fetch match requests" });
    }
  });

  app.post('/api/match-requests', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertMatchRequestSchema.parse(req.body);
      
      const matchRequest = await storage.createMatchRequest({
        ...validatedData,
        userId,
      });
      
      // Get user info for the broadcast message
      const user = await storage.getUser(userId);
      const displayName = user?.gamertag || user?.firstName || 'A player';
      
      // Broadcast new match request to all users
      (app as any).broadcast?.toAll({
        type: 'match_request_created',
        data: matchRequest,
        message: `New ${matchRequest.gameName} ${matchRequest.gameMode} match request from ${displayName}`
      });
      
      res.status(201).json(matchRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error creating match request:", error);
        res.status(500).json({ message: "Failed to create match request" });
      }
    }
  });

  app.patch('/api/match-requests/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      
      if (!['waiting', 'connected', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // First check if the match request exists and verify ownership
      const existingRequest = await storage.getMatchRequests();
      const requestToUpdate = existingRequest.matchRequests.find((r: any) => r.id === id);
      
      if (!requestToUpdate) {
        return res.status(404).json({ message: "Match request not found" });
      }
      
      if (requestToUpdate.userId !== userId) {
        return res.status(403).json({ message: "You can only update your own match requests" });
      }
      
      const updatedRequest = await storage.updateMatchRequestStatus(id, status);
      
      // Broadcast match request status update
      (app as any).broadcast?.toAll({
        type: 'match_request_updated',
        data: updatedRequest,
        message: `Match request status updated to ${status}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating match request:", error);
      res.status(500).json({ message: "Failed to update match request" });
    }
  });

  // Get single match request by ID
  app.get('/api/match-requests/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const matchRequests = await storage.getMatchRequests();
      const matchRequest = matchRequests.matchRequests.find((r: any) => r.id === id);
      
      if (!matchRequest) {
        return res.status(404).json({ message: "Match request not found" });
      }
      
      res.json(matchRequest);
    } catch (error) {
      console.error("Error fetching match request:", error);
      res.status(500).json({ message: "Failed to fetch match request" });
    }
  });

  app.delete('/api/match-requests/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // First check if the match request exists and verify ownership
      const existingRequest = await storage.getMatchRequests();
      const requestToDelete = existingRequest.matchRequests.find((r: any) => r.id === id);
      
      if (!requestToDelete) {
        return res.status(404).json({ message: "Match request not found" });
      }
      
      if (requestToDelete.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own match requests" });
      }
      
      await storage.deleteMatchRequest(id);
      
      // Broadcast match request deletion to all users
      (app as any).broadcast?.toAll({
        type: 'match_request_deleted',
        data: { id },
        message: `Match request deleted`
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting match request:", error);
      res.status(500).json({ message: "Failed to delete match request" });
    }
  });

  // Match connection routes
  app.post('/api/match-connections', authMiddleware, async (req: any, res) => {
    try {
      const requesterId = req.user.id;
      const { requestId, accepterId } = req.body;
      
      // Validation
      if (!requestId || !accepterId) {
        return res.status(400).json({ message: "requestId and accepterId are required" });
      }
      
      // Prevent self-connections
      if (requesterId === accepterId) {
        return res.status(400).json({ message: "You cannot connect to your own match request" });
      }
      
      // Verify the match request exists
      const matchRequests = await storage.getMatchRequests();
      const matchRequest = matchRequests.matchRequests.find((r: any) => r.id === requestId);
      
      if (!matchRequest) {
        return res.status(404).json({ message: "Match request not found" });
      }
      
      // Verify accepterId matches the owner of the match request
      if (matchRequest.userId !== accepterId) {
        return res.status(400).json({ message: "accepterId must be the owner of the match request" });
      }
      
      // Check for existing connection to prevent duplicates
      const existingConnections = await storage.getUserConnections(requesterId);
      const duplicateConnection = existingConnections.find(c => 
        c.requestId === requestId && c.accepterId === accepterId
      );
      
      if (duplicateConnection) {
        return res.status(400).json({ message: "Connection already exists for this match request" });
      }
      
      const connection = await storage.createMatchConnection({
        requestId,
        requesterId,
        accepterId,
      });
      
      // Notify the accepter that someone applied to their match
      const requesterUser = await storage.getUser(requesterId);
      const notification = await storage.createNotification({
        userId: accepterId,
        type: "match_application",
        title: "New Match Application",
        message: `${requesterUser?.gamertag || "Someone"} wants to join your ${matchRequest.gameName} ${matchRequest.gameMode} match`,
        relatedUserId: requesterId,
        relatedMatchId: requestId,
        isRead: false,
      });
      
      // Broadcast notification in real-time
      (app as any).broadcast?.toUsers([accepterId], {
        type: 'new_notification',
        data: notification
      });
      
      // Send push notification
      sendPushNotification(accepterId, {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedUserId: requesterId,
        relatedMatchId: requestId,
      }).catch(err => console.error('Failed to send push notification:', err));
      
      // Broadcast match connection to both users
      (app as any).broadcast?.toUsers([requesterId, accepterId], {
        type: 'match_connection_created',
        data: connection,
        message: `New match connection created`
      });
      
      res.status(201).json(connection);
    } catch (error) {
      console.error("Error creating match connection:", error);
      res.status(500).json({ message: "Failed to create match connection" });
    }
  });

  app.patch('/api/match-connections/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      
      if (!['pending', 'accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // First check if the connection exists and verify user is a participant
      const userConnections = await storage.getUserConnections(userId);
      const connectionToUpdate = userConnections.find(c => c.id === id);
      
      if (!connectionToUpdate) {
        return res.status(404).json({ message: "Match connection not found or you are not authorized to modify it" });
      }
      
      const updatedConnection = await storage.updateMatchConnectionStatus(id, status);
      
      // Notify the requester of the status change
      if (status === 'accepted') {
        const accepterUser = await storage.getUser(connectionToUpdate.accepterId);
        const notification = await storage.createNotification({
          userId: connectionToUpdate.requesterId,
          type: "match_accepted",
          title: "Match Application Accepted",
          message: `${accepterUser?.gamertag || "Someone"} accepted your match application`,
          relatedUserId: connectionToUpdate.accepterId,
          relatedMatchId: connectionToUpdate.requestId,
          isRead: false,
        });
        
        // Broadcast notification in real-time
        (app as any).broadcast?.toUsers([connectionToUpdate.requesterId], {
          type: 'new_notification',
          data: notification
        });
        
        // Send push notification
        sendPushNotification(connectionToUpdate.requesterId, {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedUserId: connectionToUpdate.accepterId,
          relatedMatchId: connectionToUpdate.requestId,
        }).catch(err => console.error('Failed to send push notification:', err));
      } else if (status === 'declined') {
        const accepterUser = await storage.getUser(connectionToUpdate.accepterId);
        const notification = await storage.createNotification({
          userId: connectionToUpdate.requesterId,
          type: "match_declined",
          title: "Match Application Declined",
          message: `${accepterUser?.gamertag || "Someone"} declined your match application`,
          relatedUserId: connectionToUpdate.accepterId,
          relatedMatchId: connectionToUpdate.requestId,
          isRead: false,
        });
        
        // Broadcast notification in real-time
        (app as any).broadcast?.toUsers([connectionToUpdate.requesterId], {
          type: 'new_notification',
          data: notification
        });
        
        // Send push notification
        sendPushNotification(connectionToUpdate.requesterId, {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedUserId: connectionToUpdate.accepterId,
          relatedMatchId: connectionToUpdate.requestId,
        }).catch(err => console.error('Failed to send push notification:', err));
      }
      
      // Broadcast connection status update to participants
      (app as any).broadcast?.toUsers([connectionToUpdate.requesterId, connectionToUpdate.accepterId], {
        type: 'match_connection_updated',
        data: updatedConnection,
        message: `Match connection status updated to ${status}`
      });
      
      res.json(updatedConnection);
    } catch (error) {
      console.error("Error updating match connection:", error);
      res.status(500).json({ message: "Failed to update match connection" });
    }
  });

  app.get('/api/user/connections', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching user connections:", error);
      res.status(500).json({ message: "Failed to fetch user connections" });
    }
  });

  // Connection request routes (direct user-to-user, no match required)
  app.post('/api/connection-requests', authMiddleware, async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.body;
      
      if (!receiverId) {
        return res.status(400).json({ message: "receiverId is required" });
      }
      
      if (senderId === receiverId) {
        return res.status(400).json({ message: "You cannot send a connection request to yourself" });
      }
      
      const existingRequests = await storage.getConnectionRequests(senderId);
      const duplicateRequest = existingRequests.find(r => 
        r.status === 'pending' &&
        ((r.senderId === senderId && r.receiverId === receiverId) ||
        (r.senderId === receiverId && r.receiverId === senderId))
      );
      
      if (duplicateRequest) {
        return res.status(400).json({ message: "Connection request already exists" });
      }
      
      const request = await storage.createConnectionRequest({
        senderId,
        receiverId,
      });
      
      // Notify the receiver about the new connection request
      const senderUser = await storage.getUser(senderId);
      const notification = await storage.createNotification({
        userId: receiverId,
        type: "connection_request",
        title: "New Connection Request",
        message: `${senderUser?.gamertag || "Someone"} wants to connect with you`,
        relatedUserId: senderId,
        isRead: false,
      });
      
      // Broadcast notification in real-time
      (app as any).broadcast?.toUsers([receiverId], {
        type: 'new_notification',
        data: notification
      });
      
      // Send push notification
      sendPushNotification(receiverId, {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedUserId: senderId,
      }).catch(err => console.error('Failed to send push notification:', err));
      
      (app as any).broadcast?.toUsers([senderId, receiverId], {
        type: 'connection_request_created',
        data: request,
        message: 'New connection request created'
      });
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating connection request:", error);
      res.status(500).json({ message: "Failed to create connection request" });
    }
  });

  app.patch('/api/connection-requests/:id/status', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      
      if (!['pending', 'accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const userRequests = await storage.getConnectionRequests(userId);
      const requestToUpdate = userRequests.find(r => r.id === id);
      
      if (!requestToUpdate) {
        return res.status(404).json({ message: "Connection request not found or you are not authorized to modify it" });
      }
      
      // If declined, delete the request and notify sender
      if (status === 'declined') {
        await storage.deleteConnectionRequest(id, userId);
        
        // Notify the sender that their request was declined
        const receiverUser = await storage.getUser(requestToUpdate.receiverId);
        const notification = await storage.createNotification({
          userId: requestToUpdate.senderId,
          type: "connection_declined",
          title: "Connection Request Declined",
          message: `${receiverUser?.gamertag || "Someone"} declined your connection request`,
          relatedUserId: requestToUpdate.receiverId,
          isRead: false,
        });
        
        // Broadcast notification in real-time
        (app as any).broadcast?.toUsers([requestToUpdate.senderId], {
          type: 'new_notification',
          data: notification
        });
        
        // Send push notification
        sendPushNotification(requestToUpdate.senderId, {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedUserId: requestToUpdate.receiverId,
        }).catch(err => console.error('Failed to send push notification:', err));
        
        (app as any).broadcast?.toUsers([requestToUpdate.senderId, requestToUpdate.receiverId], {
          type: 'connection_request_deleted',
          data: { id },
          message: 'Connection request declined and removed'
        });
        
        return res.status(204).send();
      }
      
      const updatedRequest = await storage.updateConnectionRequestStatus(id, status);
      
      // If accepted, notify the sender
      if (status === 'accepted') {
        const receiverUser = await storage.getUser(requestToUpdate.receiverId);
        const notification = await storage.createNotification({
          userId: requestToUpdate.senderId,
          type: "connection_accepted",
          title: "Connection Request Accepted",
          message: `${receiverUser?.gamertag || "Someone"} accepted your connection request`,
          relatedUserId: requestToUpdate.receiverId,
          isRead: false,
        });
        
        // Broadcast notification in real-time
        (app as any).broadcast?.toUsers([requestToUpdate.senderId], {
          type: 'new_notification',
          data: notification
        });
        
        // Send push notification
        sendPushNotification(requestToUpdate.senderId, {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedUserId: requestToUpdate.receiverId,
        }).catch(err => console.error('Failed to send push notification:', err));
      }
      
      (app as any).broadcast?.toUsers([requestToUpdate.senderId, requestToUpdate.receiverId], {
        type: 'connection_request_updated',
        data: updatedRequest,
        message: `Connection request status updated to ${status}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating connection request:", error);
      res.status(500).json({ message: "Failed to update connection request" });
    }
  });

  app.get('/api/connection-requests', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getConnectionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching connection requests:", error);
      res.status(500).json({ message: "Failed to fetch connection requests" });
    }
  });

  app.delete('/api/connection-requests/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get the request details before deleting to broadcast to both users
      const userRequests = await storage.getConnectionRequests(userId);
      const requestToDelete = userRequests.find(r => r.id === id);
      
      if (!requestToDelete) {
        return res.status(404).json({ message: 'Connection request not found or you are not authorized to delete it' });
      }
      
      await storage.deleteConnectionRequest(id, userId);
      
      // Broadcast to both sender and receiver
      (app as any).broadcast?.toUsers([requestToDelete.senderId, requestToDelete.receiverId], {
        type: 'connection_request_deleted',
        data: { id },
        message: 'Connection request deleted'
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting connection request:", error);
      if (error.message === 'Connection request not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Unauthorized to delete this connection request') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete connection request" });
    }
  });

  app.delete('/api/match-connections/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get the connection details before deleting to broadcast to both users
      const userConnections = await storage.getUserConnections(userId);
      const connectionToDelete = userConnections.find(c => c.id === id);
      
      if (!connectionToDelete) {
        return res.status(404).json({ message: 'Match connection not found or you are not authorized to delete it' });
      }
      
      await storage.deleteMatchConnection(id, userId);
      
      // Broadcast to both requester and accepter
      (app as any).broadcast?.toUsers([connectionToDelete.requesterId, connectionToDelete.accepterId], {
        type: 'match_connection_deleted',
        data: { id },
        message: 'Match connection deleted'
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting match connection:", error);
      if (error.message === 'Match connection not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Unauthorized to delete this match connection') {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete match connection" });
    }
  });

  // User profile routes
  app.get('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.patch('/api/user/profile', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.patch('/api/user/privacy', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { updatePrivacySettingsSchema } = await import("@shared/schema");
      
      const validatedSettings = updatePrivacySettingsSchema.parse(req.body);
      const updatedUser = await storage.updatePrivacySettings(userId, validatedSettings);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid privacy settings", errors: error.errors });
      } else {
        console.error("Error updating privacy settings:", error);
        res.status(500).json({ message: "Failed to update privacy settings" });
      }
    }
  });

  app.patch('/api/users/me/settings', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceOverlayEnabled } = req.body;
      
      if (typeof voiceOverlayEnabled !== 'boolean' && voiceOverlayEnabled !== undefined) {
        return res.status(400).json({ message: "voiceOverlayEnabled must be a boolean" });
      }
      
      const updatedUser = await storage.updateUserProfile(userId, { 
        voiceOverlayEnabled 
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Photo upload route - uses R2 cloud storage if configured, falls back to local storage
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only image files are allowed!'));
    }
  });

  // Serve uploaded files statically (for local fallback)
  app.use('/uploads', express.static(uploadsDir));

  app.post('/api/upload-photo', authMiddleware, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.id;
      const originalFilename = req.file.originalname;

      // Try R2 first, fallback to local storage
      if (r2Storage.isConfigured()) {
        console.log(`[R2 Upload] Uploading profile photo for user ${userId}`);
        // generateFileKey takes filename as-is, just sanitizes and adds timestamp
        const fileKey = generateFileKey(userId, originalFilename, 'profile-photos');
        console.log(`[R2 Upload] Generated file key: ${fileKey}`);
        
        const fileUrl = await r2Storage.uploadFile({
          key: fileKey,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });
        
        console.log(`[R2 Upload] Successfully uploaded to: ${fileUrl}`);
        res.json({ url: fileUrl });
      } else {
        console.log('[R2 Upload] R2 not configured, using local storage fallback');
        // Fallback to local storage
        const fileExtension = path.extname(originalFilename);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const localFilename = uniqueSuffix + fileExtension;
        const filepath = path.join(uploadsDir, localFilename);
        
        fs.writeFileSync(filepath, req.file.buffer);
        const fileUrl = `/uploads/${localFilename}`;
        res.json({ url: fileUrl });
      }
    } catch (error: any) {
      console.error('[R2 Upload] Error uploading photo:', error);
      res.status(500).json({ message: error.message || 'Failed to upload photo' });
    }
  });

  // Game profile routes
  // Get all game profiles for a user
  app.get('/api/users/:userId/game-profiles', async (req, res) => {
    try {
      const { userId } = req.params;
      const profiles = await storage.getUserGameProfiles(userId);
      res.json(profiles);
    } catch (error: any) {
      console.error('Error fetching game profiles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new game profile
  app.post('/api/game-profiles', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.createGameProfile({
        ...req.body,
        userId,
      });
      res.status(201).json(profile);
    } catch (error: any) {
      console.error('Error creating game profile:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update a game profile
  app.patch('/api/game-profiles/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getGameProfile(id);
      
      if (!profile) {
        return res.status(404).json({ error: 'Game profile not found' });
      }
      
      if (profile.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const updatedProfile = await storage.updateGameProfile(id, req.body);
      res.json(updatedProfile);
    } catch (error: any) {
      console.error('Error updating game profile:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a game profile
  app.delete('/api/game-profiles/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await storage.deleteGameProfile(id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting game profile:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Hobbies/Interests routes
  app.get('/api/users/:userId/hobbies', async (req, res) => {
    try {
      const { userId } = req.params;
      const { category } = req.query;
      const hobbies = await storage.getUserHobbies(userId, category as string);
      res.json(hobbies);
    } catch (error: any) {
      console.error('Error fetching hobbies:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/hobbies', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const hobbyData = { ...req.body, userId };
      const hobby = await storage.createHobby(hobbyData);
      res.status(201).json(hobby);
    } catch (error: any) {
      console.error('Error creating hobby:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/hobbies/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const hobby = await storage.getHobby(id);
      
      if (!hobby) {
        return res.status(404).json({ error: 'Hobby not found' });
      }
      
      if (hobby.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const updatedHobby = await storage.updateHobby(id, req.body);
      res.json(updatedHobby);
    } catch (error: any) {
      console.error('Error updating hobby:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/hobbies/:id', authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await storage.deleteHobby(id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting hobby:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mutuals routes
  app.get('/api/mutuals/:userId', authMiddleware, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;
      
      // Get user privacy settings
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if users are connected
      const connections = await storage.getUserConnections(currentUserId);
      const isConnected = connections.some(c => 
        (c.requesterId === userId || c.accepterId === userId) && c.status === 'accepted'
      );
      
      const result: any = {};
      
      // Apply privacy settings
      if (targetUser.showMutualGames === 'everyone' || 
          (targetUser.showMutualGames === 'connections' && isConnected)) {
        result.mutualGames = await storage.getMutualGames(currentUserId, userId);
      }
      
      if (targetUser.showMutualFriends === 'everyone' || 
          (targetUser.showMutualFriends === 'connections' && isConnected)) {
        result.mutualFriends = await storage.getMutualFriends(currentUserId, userId);
      }
      
      if (targetUser.showMutualHobbies === 'everyone' || 
          (targetUser.showMutualHobbies === 'connections' && isConnected)) {
        result.mutualHobbies = await storage.getMutualHobbies(currentUserId, userId);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Error calculating mutuals:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Hidden matches routes
  app.get('/api/hidden-matches', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const hiddenIds = await storage.getHiddenMatchIds(userId);
      res.json(hiddenIds);
    } catch (error) {
      console.error("Error fetching hidden matches:", error);
      res.status(500).json({ message: "Failed to fetch hidden matches" });
    }
  });

  app.post('/api/hidden-matches', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { matchRequestId } = req.body;
      
      if (!matchRequestId) {
        return res.status(400).json({ message: "matchRequestId is required" });
      }
      
      const hidden = await storage.hideMatchRequest(userId, matchRequestId);
      res.status(201).json(hidden);
    } catch (error) {
      console.error("Error hiding match request:", error);
      res.status(500).json({ message: "Failed to hide match request" });
    }
  });

  app.delete('/api/hidden-matches/:matchRequestId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { matchRequestId } = req.params;
      
      await storage.unhideMatchRequest(userId, matchRequestId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unhiding match request:", error);
      res.status(500).json({ message: "Failed to unhide match request" });
    }
  });

  // Chat message routes
  app.get('/api/messages/:connectionId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { connectionId } = req.params;
      
      // Verify user is part of this connection (check both match connections AND connection requests)
      const userConnections = await storage.getUserConnections(userId);
      const connectionRequests = await storage.getConnectionRequests(userId);
      
      const hasMatchConnectionAccess = userConnections.some(c => c.id === connectionId);
      // Only allow messaging for accepted connection requests
      const hasConnectionRequestAccess = connectionRequests.some(c => c.id === connectionId && c.status === 'accepted');
      
      if (!hasMatchConnectionAccess && !hasConnectionRequestAccess) {
        return res.status(403).json({ message: "You don't have access to this conversation" });
      }
      
      const messages = await storage.getMessages(connectionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', authMiddleware, async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const { connectionId, receiverId, message } = req.body;
      
      if (!connectionId || !receiverId || !message) {
        return res.status(400).json({ message: "connectionId, receiverId, and message are required" });
      }
      
      // Verify user is part of this connection (check both match connections AND connection requests)
      const userConnections = await storage.getUserConnections(senderId);
      const connectionRequests = await storage.getConnectionRequests(senderId);
      
      const matchConnection = userConnections.find(c => c.id === connectionId);
      // Only allow messaging for accepted connection requests
      const connectionRequest = connectionRequests.find(c => c.id === connectionId && c.status === 'accepted');
      
      if (!matchConnection && !connectionRequest) {
        return res.status(403).json({ message: "You don't have access to this conversation" });
      }
      
      // Verify receiverId is the other participant (works for both types)
      let validReceiver = false;
      if (matchConnection) {
        validReceiver = matchConnection.requesterId === receiverId || matchConnection.accepterId === receiverId;
      } else if (connectionRequest) {
        validReceiver = connectionRequest.senderId === receiverId || connectionRequest.receiverId === receiverId;
      }
      
      if (!validReceiver) {
        return res.status(400).json({ message: "Invalid receiverId for this connection" });
      }
      
      const newMessage = await storage.sendMessage({
        connectionId,
        senderId,
        receiverId,
        message,
      });
      
      // Broadcast message to receiver via WebSocket
      (app as any).broadcast?.toUsers([receiverId], {
        type: 'new_message',
        data: newMessage,
        message: 'New message received'
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Notification routes
  app.get('/api/notifications', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { unreadOnly } = req.query;
      
      const notifications = await storage.getUserNotifications(
        userId,
        unreadOnly === 'true'
      );
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch('/api/notifications/:id/read', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const notification = await storage.markNotificationAsRead(id, userId);
      
      res.json(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark notification as read";
      
      if (errorMessage.includes("not found")) {
        return res.status(404).json({ message: errorMessage });
      }
      if (errorMessage.includes("Unauthorized")) {
        return res.status(403).json({ message: errorMessage });
      }
      
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: errorMessage });
    }
  });

  app.patch('/api/notifications/read-all', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/delete-all', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.deleteAllNotifications(userId);
      res.json({ message: "All notifications deleted" });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ message: "Failed to delete all notifications" });
    }
  });

  app.delete('/api/notifications/:id', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      await storage.deleteNotification(id, userId);
      
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete notification";
      
      if (errorMessage.includes("not found")) {
        return res.status(404).json({ message: errorMessage });
      }
      if (errorMessage.includes("Unauthorized")) {
        return res.status(403).json({ message: errorMessage });
      }
      
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: errorMessage });
    }
  });

  // Push notification routes
  const { vapidPublicKey, sendPushNotification } = await import('./pushNotifications');
  
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post('/api/push/subscribe', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }

      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.status(201).json({ success: true, subscription });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ message: 'Failed to save push subscription' });
    }
  });

  app.post('/api/push/unsubscribe', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: 'Endpoint is required' });
      }

      await storage.deletePushSubscription(endpoint, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ message: 'Failed to remove push subscription' });
    }
  });

  // Voice channel routes
  app.get('/api/voice/channel/:connectionId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { connectionId } = req.params;
      
      // Verify user is part of this connection
      const userConnections = await storage.getUserConnections(userId);
      const connectionRequests = await storage.getConnectionRequests(userId);
      
      const hasMatchConnectionAccess = userConnections.some(c => c.id === connectionId);
      const hasConnectionRequestAccess = connectionRequests.some(c => c.id === connectionId && c.status === 'accepted');
      
      if (!hasMatchConnectionAccess && !hasConnectionRequestAccess) {
        return res.status(403).json({ message: "You don't have access to this voice channel" });
      }
      
      const channel = await storage.getVoiceChannel(connectionId);
      if (!channel) {
        return res.json({ channel: null, participants: [] });
      }
      
      const participants = await storage.getVoiceParticipants(channel.id);
      res.json({ channel, participants });
    } catch (error) {
      console.error("Error fetching voice channel:", error);
      res.status(500).json({ message: "Failed to fetch voice channel" });
    }
  });

  app.post('/api/voice/join', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { connectionId } = req.body;
      
      if (!connectionId) {
        return res.status(400).json({ message: "connectionId is required" });
      }

      if (!hmsService.isConfigured()) {
        return res.status(503).json({ message: "Voice service is not configured" });
      }
      
      // Verify user is part of this connection
      const userConnections = await storage.getUserConnections(userId);
      const connectionRequests = await storage.getConnectionRequests(userId);
      
      const hasMatchConnectionAccess = userConnections.some(c => c.id === connectionId);
      const hasConnectionRequestAccess = connectionRequests.some(c => c.id === connectionId && c.status === 'accepted');
      
      if (!hasMatchConnectionAccess && !hasConnectionRequestAccess) {
        return res.status(403).json({ message: "You don't have access to this voice channel" });
      }
      
      // Leave any existing voice channel first
      const existingChannel = await storage.getUserActiveVoiceChannel(userId);
      if (existingChannel) {
        await storage.leaveVoiceChannel(existingChannel.id, userId);
      }
      
      // Get existing channel or create new one
      const existingVoiceChannel = await storage.getVoiceChannel(connectionId);
      
      let hmsRoomId: string;
      
      if (existingVoiceChannel && existingVoiceChannel.hmsRoomId) {
        // Reuse existing HMS room
        hmsRoomId = existingVoiceChannel.hmsRoomId;
      } else {
        // Create new HMS room
        const room = await hmsService.createRoom({
          name: generateRoomName(connectionId),
          description: 'Voice channel for connection'
        });
        hmsRoomId = room?.id || room?.data?.id;
        
        if (!hmsRoomId) {
          console.error('HMS room ID not found in response:', room);
          throw new Error('Failed to get room ID from HMS');
        }
      }
      
      // Get or create voice channel with HMS room ID
      const channel = await storage.getOrCreateVoiceChannel(connectionId, hmsRoomId);
      
      // Join the channel
      const participant = await storage.joinVoiceChannel(channel.id, userId);
      
      // Generate HMS auth token with speaker role for audio
      const token = await hmsService.generateAuthToken({
        roomId: hmsRoomId,
        userId,
        role: 'speaker'
      });
      
      const participants = await storage.getVoiceParticipants(channel.id);
      const currentUser = await storage.getUser(userId);
      
      // Broadcast to other participants
      const otherUserIds = participants
        .filter(p => p.userId !== userId)
        .map(p => p.userId);
      
      // Only send notification if this is the first user joining (channel was empty)
      const wasChannelEmpty = participants.length === 1; // Only includes current user after join
      
      if (otherUserIds.length > 0) {
        (app as any).broadcast?.toUsers(otherUserIds, {
          type: 'voice_participant_joined',
          data: { connectionId, participant, participants },
          message: 'User joined voice channel'
        });
      }
      
      // Create notification only when joining an empty channel (someone is now waiting)
      if (wasChannelEmpty && otherUserIds.length === 0) {
        // Get the other user in this connection to notify them
        const userConnections = await storage.getUserConnections(userId);
        const connectionRequests = await storage.getConnectionRequests(userId);
        
        const matchConnection = userConnections.find(c => c.id === connectionId);
        const requestConnection = connectionRequests.find(c => c.id === connectionId);
        
        let otherUserId: string | null = null;
        
        if (matchConnection) {
          // MatchConnection has requesterId and accepterId
          otherUserId = matchConnection.requesterId === userId ? matchConnection.accepterId : matchConnection.requesterId;
        } else if (requestConnection) {
          // ConnectionRequest has senderId and receiverId
          otherUserId = requestConnection.senderId === userId ? requestConnection.receiverId : requestConnection.senderId;
        }
        
        if (otherUserId) {
          
          // Check for recent duplicate notifications (within last 5 minutes)
          const recentNotifications = await storage.getUserNotifications(otherUserId, false);
          const hasDuplicateRecent = recentNotifications.some(n => 
            n.type === 'voice_call_waiting' && 
            n.createdAt && 
            Date.now() - new Date(n.createdAt).getTime() < 5 * 60 * 1000
          );
          
          if (!hasDuplicateRecent) {
            await storage.createNotification({
              userId: otherUserId,
              type: 'voice_call_waiting',
              title: 'Voice Call Waiting',
              message: `${currentUser?.gamertag || 'A friend'} is waiting in your personal voice channel`,
              actionUrl: '/connections',
              isRead: false,
            });
            
            // Broadcast notification event
            (app as any).broadcast?.toUsers([otherUserId], {
              type: 'new_notification',
              message: 'New notification'
            });
          }
        }
      }
      
      res.json({ token, roomId: hmsRoomId });
    } catch (error) {
      console.error("Error joining voice channel:", error);
      res.status(500).json({ message: "Failed to join voice channel" });
    }
  });

  app.post('/api/voice/leave', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { connectionId } = req.body;
      
      if (!connectionId) {
        return res.status(400).json({ message: "connectionId is required" });
      }
      
      const channel = await storage.getVoiceChannel(connectionId);
      if (!channel) {
        return res.json({ success: true });
      }
      
      // Get participants before leaving
      const participantsBefore = await storage.getVoiceParticipants(channel.id);
      const otherUserIds = participantsBefore
        .filter(p => p.userId !== userId)
        .map(p => p.userId);
      
      await storage.leaveVoiceChannel(channel.id, userId);
      
      // Clean up voice_call_waiting notifications when leaving
      // Get the other user in this connection to clean up their notifications
      const currentUser = req.user; // Get current user from auth middleware
      const userConnections = await storage.getUserConnections(userId);
      const connectionRequests = await storage.getConnectionRequests(userId);
      
      const matchConnection = userConnections.find(c => c.id === connectionId);
      const requestConnection = connectionRequests.find(c => c.id === connectionId);
      
      let otherUserId: string | null = null;
      
      if (matchConnection) {
        otherUserId = matchConnection.requesterId === userId ? matchConnection.accepterId : matchConnection.requesterId;
      } else if (requestConnection) {
        otherUserId = requestConnection.senderId === userId ? requestConnection.receiverId : requestConnection.senderId;
      }
      
      if (otherUserId && currentUser) {
        // Delete voice_call_waiting notifications for the other user created by this user
        const notifications = await storage.getUserNotifications(otherUserId, false);
        const waitingNotifications = notifications.filter(n => 
          n.type === 'voice_call_waiting' && 
          n.message?.includes(currentUser.gamertag || 'A friend')
        );
        
        // Mark these notifications as read to remove them from the UI
        for (const notification of waitingNotifications) {
          await storage.markNotificationAsRead(notification.id, otherUserId);
        }
      }
      
      // Broadcast to other participants
      if (otherUserIds.length > 0) {
        const participantsAfter = await storage.getVoiceParticipants(channel.id);
        (app as any).broadcast?.toUsers(otherUserIds, {
          type: 'voice_participant_left',
          data: { connectionId, userId, participants: participantsAfter },
          message: 'User left voice channel'
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving voice channel:", error);
      res.status(500).json({ message: "Failed to leave voice channel" });
    }
  });

  app.post('/api/voice/mute', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { connectionId, isMuted } = req.body;
      
      if (!connectionId || isMuted === undefined) {
        return res.status(400).json({ message: "connectionId and isMuted are required" });
      }
      
      const channel = await storage.getVoiceChannel(connectionId);
      if (!channel) {
        return res.status(404).json({ message: "Voice channel not found" });
      }
      
      const participant = await storage.updateParticipantMuteStatus(channel.id, userId, isMuted);
      const participants = await storage.getVoiceParticipants(channel.id);
      
      // Broadcast mute status to other participants
      const otherUserIds = participants
        .filter(p => p.userId !== userId)
        .map(p => p.userId);
      
      if (otherUserIds.length > 0) {
        (app as any).broadcast?.toUsers(otherUserIds, {
          type: 'voice_participant_muted',
          data: { connectionId, userId, isMuted, participants },
          message: 'User mute status changed'
        });
      }
      
      res.json({ participant, participants });
    } catch (error) {
      console.error("Error updating mute status:", error);
      res.status(500).json({ message: "Failed to update mute status" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time match updates using noServer mode
  // This allows Vite's HMR WebSocket to coexist on the same HTTP server
  const wss = new WebSocketServer({ 
    noServer: true
  });

  // Manually handle upgrade requests, only accepting /ws path
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    // Only handle /ws upgrades, leave others (like Vite HMR) untouched
    if (pathname === '/ws') {
      // Validate Origin to prevent cross-site WebSocket hijacking
      const origin = request.headers.origin;
      const host = request.headers.host;
      
      if (!origin || !host) {
        console.log('WebSocket connection rejected: Missing origin or host');
        socket.destroy();
        return;
      }
      
      try {
        // Extract hostname from origin using URL parsing for robustness
        const originHost = new URL(origin).host;
        
        // Allow same-origin connections
        let isAllowed = originHost === host;
        
        if (!isAllowed) {
          // Allow configured CORS origins (for split deployments like Vercel + Railway)
          const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
          const frontendUrl = process.env.FRONTEND_URL;
          
          // Check if origin matches CORS_ORIGIN or FRONTEND_URL
          if (frontendUrl) {
            try {
              const frontendHost = new URL(frontendUrl).host;
              if (originHost === frontendHost) {
                console.log(`WebSocket connection allowed from configured frontend: ${origin}`);
                isAllowed = true;
              }
            } catch (e) {
              // Invalid FRONTEND_URL, ignore
            }
          }
          
          // Check if origin is in CORS_ORIGIN list
          if (!isAllowed && allowedOrigins.some(allowed => {
            try {
              return new URL(allowed).host === originHost;
            } catch {
              return allowed === origin;
            }
          })) {
            console.log(`WebSocket connection allowed from CORS origin: ${origin}`);
            isAllowed = true;
          }
        }
        
        if (!isAllowed) {
          console.log(`WebSocket connection rejected: Origin ${origin} (${originHost}) does not match host ${host} or allowed origins`);
          socket.destroy();
          return;
        }
        
        // Origin is valid, handle the upgrade
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.log(`WebSocket connection rejected: Invalid origin URL ${origin}`);
        socket.destroy();
      }
    }
    // For other paths (like Vite HMR), do nothing and let other handlers process them
  });

  // Store connected clients with their user info and heartbeat tracking
  const connectedClients = new Map<string, { ws: WebSocket; userId?: string; lastPong?: number }>();
  
  // Heartbeat mechanism to detect and clean up stale connections
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    connectedClients.forEach(({ ws, lastPong }, clientId) => {
      if (lastPong && now - lastPong > 40000) { // 40 second timeout
        console.log(`Removing stale WebSocket connection: ${clientId}`);
        ws.terminate();
        connectedClients.delete(clientId);
      } else {
        // Send ping to check if connection is alive
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    });
  }, 30000); // Check every 30 seconds

  wss.on('connection', async (ws, req) => {
    const clientId = Math.random().toString(36).substring(2, 15);
    console.log(`WebSocket client connected: ${clientId}`);

    // Extract and validate session from the request headers
    let authenticatedUserId: string | undefined = undefined;
    
    try {
      // Parse cookies from the WebSocket request to get session
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        // Parse the session using the same session store as Express
        const sessionParser = getSession();
        
        // Create a mock request/response object to use the session parser
        const mockReq = { 
          headers: { cookie: cookieHeader },
          connection: req.socket,
          url: '/ws',
          method: 'GET'
        } as any;
        const mockRes = {} as any;

        await new Promise<void>((resolve, reject) => {
          sessionParser(mockReq, mockRes, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Check if user is authenticated through the session
        if (mockReq.session?.passport?.user) {
          authenticatedUserId = mockReq.session.passport.user;
          const userId: string = authenticatedUserId as string; // Create a typed constant for use in async callbacks
          connectedClients.set(clientId, { ws, userId: authenticatedUserId, lastPong: Date.now() });
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Authentication successful',
            userId: authenticatedUserId
          }));
          
          console.log(`WebSocket client ${clientId} authenticated as user ${authenticatedUserId}`);
          
          // Broadcast online status to connected users
          try {
            const userConnections = await storage.getUserConnections(userId);
            const connectionRequests = await storage.getConnectionRequests(userId);
            
            const connectedUserIds = new Set<string>();
            
            // Add users from accepted match connections
            userConnections.filter(c => c.status === 'accepted').forEach(conn => {
              const otherUserId = conn.requesterId === userId ? conn.accepterId : conn.requesterId;
              connectedUserIds.add(otherUserId);
            });
            
            // Add users from accepted direct connections
            connectionRequests.filter(c => c.status === 'accepted').forEach(req => {
              const otherUserId = req.senderId === userId ? req.receiverId : req.senderId;
              connectedUserIds.add(otherUserId);
            });
            
            // Broadcast to all connected users
            if (connectedUserIds.size > 0) {
              broadcastToUsers(Array.from(connectedUserIds), {
                type: 'user_online',
                userId: userId
              });
            }
          } catch (error) {
            console.error('Error broadcasting online status:', error);
          }
        } else {
          // Not authenticated - still allow connection but mark as anonymous
          connectedClients.set(clientId, { ws, lastPong: Date.now() });
          
          ws.send(JSON.stringify({
            type: 'auth_failed',
            message: 'Authentication required for personalized updates'
          }));
          
          console.log(`WebSocket client ${clientId} connected as anonymous`);
        }
      } else {
        // No cookies - anonymous connection
        connectedClients.set(clientId, { ws, lastPong: Date.now() });
        
        ws.send(JSON.stringify({
          type: 'auth_failed',
          message: 'No session found - login required for personalized updates'
        }));
        
        console.log(`WebSocket client ${clientId} connected as anonymous (no cookies)`);
      }
    } catch (error) {
      console.error('Error authenticating WebSocket connection:', error);
      connectedClients.set(clientId, { ws, lastPong: Date.now() });
      
      ws.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Authentication error'
      }));
    }
    
    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = connectedClients.get(clientId);
      if (client) {
        client.lastPong = Date.now();
      }
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WebSocket message from ${clientId}:`, data);
        
        const client = connectedClients.get(clientId);
        
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (data.type === 'voice_channel_ready' || data.type === 'voice_channel_left' || data.type === 'webrtc_offer' || data.type === 'webrtc_answer' || data.type === 'webrtc_ice_candidate') {
          // WebRTC signaling and voice channel coordination - forward to target user with authorization
          if (!client?.userId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Authentication required for WebRTC signaling' 
            }));
            return;
          }
          
          const { targetUserId, connectionId, offer, answer, candidate } = data;
          
          if (!targetUserId || !connectionId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Target user ID and connection ID required for WebRTC signaling' 
            }));
            return;
          }
          
          // Verify that both sender and target are participants in this connection
          // Check both match connections and connection requests
          try {
            const userConnections = await storage.getUserConnections(client.userId);
            const matchConnection = userConnections.find(c => c.id === connectionId);
            
            const connectionRequests = await storage.getConnectionRequests(client.userId);
            const connectionRequest = connectionRequests.find(c => c.id === connectionId);
            
            const connection = matchConnection || connectionRequest;
            
            if (!connection) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Connection not found or you are not authorized' 
              }));
              return;
            }
            
            // Verify target is the other participant
            // Match connections use requesterId/accepterId, connection requests use senderId/receiverId
            const isValidTarget = matchConnection
              ? (matchConnection.requesterId === client.userId && matchConnection.accepterId === targetUserId) ||
                (matchConnection.accepterId === client.userId && matchConnection.requesterId === targetUserId)
              : (connectionRequest!.senderId === client.userId && connectionRequest!.receiverId === targetUserId) ||
                (connectionRequest!.receiverId === client.userId && connectionRequest!.senderId === targetUserId);
            
            if (!isValidTarget) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Target user is not a participant in this connection' 
              }));
              return;
            }
            
            // Connection must be accepted for voice
            if (connection.status !== 'accepted') {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Connection must be accepted before initiating voice channel' 
              }));
              return;
            }
            
            // Authorization passed - forward the signaling message to the target user
            console.log(`[WebRTC] Forwarding ${data.type} from ${client.userId} to ${targetUserId}`);
            console.log(`[WebRTC] Connected clients count: ${connectedClients.size}`);
            
            let forwardedCount = 0;
            connectedClients.forEach((targetClient, targetClientId) => {
              console.log(`[WebRTC] Checking client ${targetClientId}: userId=${targetClient.userId}, readyState=${targetClient.ws.readyState}`);
              if (targetClient.userId === targetUserId && targetClient.ws.readyState === WebSocket.OPEN) {
                console.log(`[WebRTC] ✓ Forwarding to client ${targetClientId}`);
                targetClient.ws.send(JSON.stringify({
                  type: data.type,
                  data: {
                    connectionId,
                    offer,
                    answer,
                    candidate,
                    fromUserId: client.userId,
                    userId: client.userId  // Include userId for voice channel presence tracking
                  }
                }));
                forwardedCount++;
              }
            });
            
            console.log(`[WebRTC] Forwarded message to ${forwardedCount} client(s)`);
            
            if (forwardedCount === 0) {
              console.warn(`[WebRTC] WARNING: Target user ${targetUserId} has no active WebSocket connections`);
              ws.send(JSON.stringify({
                type: 'webrtc_error',
                message: 'Target user is not currently connected'
              }));
            }
          } catch (error) {
            console.error('Error verifying WebRTC authorization:', error);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to verify authorization' 
            }));
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      const client = connectedClients.get(clientId);
      const userId = client?.userId;
      
      connectedClients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
      
      // Broadcast offline status to connected users if this was the last connection for this user
      if (userId) {
        // Check if user has any other active connections
        const hasOtherConnections = Array.from(connectedClients.values()).some(c => c.userId === userId);
        
        if (!hasOtherConnections) {
          try {
            // Clean up group voice channel active status
            await storage.cleanupUserActiveStatus(userId);
            
            const userConnections = await storage.getUserConnections(userId);
            const connectionRequests = await storage.getConnectionRequests(userId);
            
            const connectedUserIds = new Set<string>();
            
            // Add users from accepted match connections
            userConnections.filter(c => c.status === 'accepted').forEach(conn => {
              const otherUserId = conn.requesterId === userId ? conn.accepterId : conn.requesterId;
              connectedUserIds.add(otherUserId);
            });
            
            // Add users from accepted direct connections
            connectionRequests.filter(c => c.status === 'accepted').forEach(req => {
              const otherUserId = req.senderId === userId ? req.receiverId : req.senderId;
              connectedUserIds.add(otherUserId);
            });
            
            // Broadcast to all connected users
            if (connectedUserIds.size > 0) {
              broadcastToUsers(Array.from(connectedUserIds), {
                type: 'user_offline',
                userId: userId
              });
            }
          } catch (error) {
            console.error('Error broadcasting offline status:', error);
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to GameMatch real-time updates'
    }));
  });

  // Helper function to broadcast real-time updates
  const broadcastToUsers = (userIds: string[], message: any) => {
    connectedClients.forEach((client, clientId) => {
      if (client.userId && userIds.includes(client.userId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  // Helper function to broadcast to all authenticated users
  const broadcastToAll = (message: any) => {
    connectedClients.forEach((client, clientId) => {
      if (client.userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  // Store broadcast functions for use in API routes
  (app as any).broadcast = {
    toUsers: broadcastToUsers,
    toAll: broadcastToAll
  };

  // File upload endpoints (using Cloudflare R2)
  const r2Upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  app.post('/api/upload/profile-image', authMiddleware, r2Upload.single('image'), async (req: any, res) => {
    try {
      if (!r2Storage.isConfigured()) {
        return res.status(503).json({ message: "File storage not configured" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id;
      const key = generateFileKey(userId, req.file.originalname, 'profile-images');

      const url = await r2Storage.uploadFile({
        key,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
      });

      await storage.updateUserProfile(userId, { profileImageUrl: url });

      res.json({ url });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post('/api/upload/stats-photo', authMiddleware, r2Upload.single('image'), async (req: any, res) => {
    try {
      if (!r2Storage.isConfigured()) {
        return res.status(503).json({ message: "File storage not configured" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id;
      const { gameProfileId } = req.body;

      if (!gameProfileId) {
        return res.status(400).json({ message: "Game profile ID required" });
      }

      const key = generateFileKey(userId, req.file.originalname, 'stats-photos');

      const url = await r2Storage.uploadFile({
        key,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
      });

      res.json({ url });
    } catch (error) {
      console.error("Error uploading stats photo:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post('/api/upload/clip', authMiddleware, r2Upload.single('video'), async (req: any, res) => {
    try {
      if (!r2Storage.isConfigured()) {
        return res.status(503).json({ message: "File storage not configured" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id;
      const key = generateFileKey(userId, req.file.originalname, 'clips');

      const url = await r2Storage.uploadFile({
        key,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
      });

      res.json({ url });
    } catch (error) {
      console.error("Error uploading clip:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Voice channel endpoints (using 100ms)
  app.post('/api/voice/create-room', authMiddleware, async (req: any, res) => {
    try {
      if (!hmsService.isConfigured()) {
        return res.status(503).json({ message: "Voice service not configured" });
      }

      const { connectionId } = req.body;

      if (!connectionId) {
        return res.status(400).json({ message: "Connection ID required" });
      }

      const existingChannel = await storage.getVoiceChannel(connectionId);
      
      if (existingChannel && existingChannel.hmsRoomId) {
        return res.json({
          voiceChannelId: existingChannel.id,
          roomId: existingChannel.hmsRoomId,
          message: "Using existing voice room"
        });
      }

      const roomName = generateRoomName(connectionId);
      const room = await hmsService.createRoom({
        name: roomName,
        description: `Voice channel for connection ${connectionId}`,
      });

      const voiceChannel = await storage.getOrCreateVoiceChannel(connectionId, room.id);

      res.json({
        voiceChannelId: voiceChannel.id,
        roomId: room.id,
      });
    } catch (error) {
      console.error("Error creating voice room:", error);
      res.status(500).json({ message: "Failed to create voice room" });
    }
  });


  app.get('/api/voice/:voiceChannelId/participants', authMiddleware, async (req: any, res) => {
    try {
      const { voiceChannelId } = req.params;

      const participants = await storage.getVoiceParticipants(voiceChannelId);

      res.json(participants);
    } catch (error) {
      console.error("Error fetching voice participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  app.post('/api/group-voice/create', authMiddleware, async (req: any, res) => {
    try {
      if (!hmsService.isConfigured()) {
        return res.status(503).json({ message: "Voice service not configured" });
      }

      const userId = req.user.id;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Channel name required" });
      }

      const room = await hmsService.createRoom({
        name: `group-${name}-${Date.now()}`,
        description: `Group voice channel: ${name}`,
      });

      console.log('HMS Room created:', room);
      const hmsRoomId = room?.id || room?.data?.id;
      
      if (!hmsRoomId) {
        console.error('HMS room ID not found in response:', room);
        throw new Error('Failed to get room ID from HMS');
      }

      const channel = await storage.createGroupVoiceChannel(name, userId, hmsRoomId);

      res.json({
        channelId: channel.id,
        roomId: hmsRoomId,
        inviteCode: channel.inviteCode,
      });
    } catch (error) {
      console.error("Error creating group voice channel:", error);
      res.status(500).json({ message: "Failed to create group voice channel" });
    }
  });

  app.get('/api/group-voice/channels', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const channels = await storage.getUserGroupVoiceChannels(userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching group voice channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.get('/api/group-voice/channel/:channelId', authMiddleware, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const channel = await storage.getGroupVoiceChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const members = await storage.getGroupVoiceMembers(channelId);
      res.json({ channel, members });
    } catch (error) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });

  // Public endpoint - allows unauthenticated users to view channel invite details
  app.get('/api/group-voice/channel-by-code/:inviteCode', async (req: any, res) => {
    try {
      const { inviteCode } = req.params;
      const channel = await storage.getGroupVoiceChannelByInviteWithDetails(inviteCode);
      
      if (!channel) {
        return res.status(404).json({ error: "Channel not found or invite link is invalid" });
      }

      res.json(channel);
    } catch (error) {
      console.error("Error fetching channel by invite code:", error);
      res.status(500).json({ error: "Failed to fetch channel" });
    }
  });

  app.post('/api/group-voice/accept-invite-link', authMiddleware, async (req: any, res) => {
    try {
      if (!hmsService.isConfigured()) {
        return res.status(503).json({ message: "Voice service not configured" });
      }

      const userId = req.user.id;
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ message: "Channel ID required" });
      }

      const channel = await storage.getGroupVoiceChannel(channelId);

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Add user as member if not already a member
      await storage.addGroupVoiceMember(channel.id, userId);

      res.json({ success: true, channelId: channel.id });
    } catch (error) {
      console.error("Error accepting invite link:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  app.post('/api/group-voice/join', authMiddleware, async (req: any, res) => {
    try {
      if (!hmsService.isConfigured()) {
        return res.status(503).json({ message: "Voice service not configured" });
      }

      const userId = req.user.id;
      const { channelId, inviteCode } = req.body;

      let channel;
      if (channelId) {
        channel = await storage.getGroupVoiceChannel(channelId);
      } else if (inviteCode) {
        channel = await storage.getGroupVoiceChannelByInvite(inviteCode);
      }

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      await storage.addGroupVoiceMember(channel.id, userId);
      await storage.setGroupMemberActive(channel.id, userId, true);

      if (!channel.hmsRoomId) {
        return res.status(500).json({ message: "Channel HMS room ID not found" });
      }

      const token = await hmsService.generateAuthToken({
        roomId: channel.hmsRoomId,
        userId,
        role: 'speaker',
      });

      res.json({ 
        token, 
        channelId: channel.id,
        roomId: channel.hmsRoomId 
      });
    } catch (error) {
      console.error("Error joining group voice channel:", error);
      res.status(500).json({ message: "Failed to join channel" });
    }
  });

  app.post('/api/group-voice/leave', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ message: "Channel ID required" });
      }

      await storage.setGroupMemberActive(channelId, userId, false);
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving group voice channel:", error);
      res.status(500).json({ message: "Failed to leave channel" });
    }
  });

  app.post('/api/group-voice/exit', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ message: "Channel ID required" });
      }

      const channel = await storage.getGroupVoiceChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      await storage.removeGroupVoiceMember(channelId, userId);

      const remainingMembers = await storage.getGroupVoiceMembers(channelId);
      if (remainingMembers.length === 0) {
        try {
          await storage.deleteGroupVoiceChannel(channelId, channel.creatorId);
          console.log(`[Group Voice] Channel ${channelId} automatically deleted - no members remaining`);
        } catch (deleteError) {
          console.error('[Group Voice] Error during automatic cleanup:', deleteError);
        }
      }

      res.json({ success: true, channelDeleted: remainingMembers.length === 0 });
    } catch (error) {
      console.error("Error exiting group voice channel:", error);
      res.status(500).json({ message: "Failed to exit channel" });
    }
  });

  app.post('/api/group-voice/invite', authMiddleware, async (req: any, res) => {
    try {
      const inviterId = req.user.id;
      const { channelId, userIds } = req.body;

      if (!channelId || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "Channel ID and user IDs required" });
      }

      const channel = await storage.getGroupVoiceChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const inviter = await storage.getUser(inviterId);
      const invitedUserIds: string[] = [];
      const skippedUserIds: string[] = [];

      for (const userId of userIds) {
        // Check if user already has a pending invite
        const hasExistingInvite = await storage.hasExistingPendingInvite(channelId, userId);
        if (hasExistingInvite) {
          skippedUserIds.push(userId);
          continue;
        }

        // Create invite
        await storage.createGroupVoiceInvite(channelId, inviterId, userId);
        invitedUserIds.push(userId);

        // Create notification
        await storage.createNotification({
          userId: userId,
          type: "voice_channel_invite",
          title: "Voice Channel Invite",
          message: `${inviter?.gamertag || "Someone"} invited you to join "${channel.name}"`,
          relatedUserId: inviterId,
          actionUrl: "/voice-channels",
          actionData: { channelId, inviteId: null },
        });

        // Send push notification
        try {
          await sendPushNotification(userId, {
            title: "Voice Channel Invite",
            message: `${inviter?.gamertag || "Someone"} invited you to join "${channel.name}"`,
            type: "voice_channel_invite",
            relatedUserId: inviterId
          });
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }
      }

      res.json({ 
        success: true, 
        invitedCount: invitedUserIds.length,
        skippedCount: skippedUserIds.length,
        message: skippedUserIds.length > 0 
          ? `Invited ${invitedUserIds.length} user(s). Skipped ${skippedUserIds.length} user(s) who already have pending invites.`
          : undefined
      });
    } catch (error) {
      console.error("Error inviting to group voice channel:", error);
      res.status(500).json({ message: "Failed to invite users" });
    }
  });

  // Get pending voice channel invites (received and sent)
  app.get('/api/group-voice/invites', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const receivedInvites = await storage.getPendingGroupVoiceInvites(userId);
      const sentInvites = await storage.getSentGroupVoiceInvites(userId);
      res.json([...receivedInvites, ...sentInvites]);
    } catch (error) {
      console.error("Error fetching pending invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  // Cancel voice channel invite (inviter only)
  app.delete('/api/group-voice/invite/:inviteId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inviteId } = req.params;

      const invite = await storage.getGroupVoiceInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.inviterId !== userId) {
        return res.status(403).json({ message: "Unauthorized - only inviter can cancel" });
      }

      await storage.declineGroupVoiceInvite(inviteId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling invite:", error);
      res.status(500).json({ message: "Failed to cancel invite" });
    }
  });

  // Accept voice channel invite
  app.post('/api/group-voice/invite/:inviteId/accept', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inviteId } = req.params;

      const invite = await storage.getGroupVoiceInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.inviteeId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.acceptGroupVoiceInvite(inviteId);

      // Create notification for inviter
      const invitee = await storage.getUser(userId);
      const channel = await storage.getGroupVoiceChannel(invite.channelId);
      
      await storage.createNotification({
        userId: invite.inviterId,
        type: "voice_channel_invite_accepted",
        title: "Invite Accepted",
        message: `${invitee?.gamertag || "Someone"} accepted your invite to "${channel?.name || "voice channel"}"`,
        relatedUserId: userId,
        actionUrl: "/voice-channels",
      });

      res.json({ success: true, channelId: invite.channelId });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Decline voice channel invite
  app.post('/api/group-voice/invite/:inviteId/decline', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inviteId } = req.params;

      const invite = await storage.getGroupVoiceInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.inviteeId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.declineGroupVoiceInvite(inviteId);

      // Optionally create notification for inviter
      const invitee = await storage.getUser(userId);
      const channel = await storage.getGroupVoiceChannel(invite.channelId);
      
      await storage.createNotification({
        userId: invite.inviterId,
        type: "voice_channel_invite_declined",
        title: "Invite Declined",
        message: `${invitee?.gamertag || "Someone"} declined your invite to "${channel?.name || "voice channel"}"`,
        relatedUserId: userId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error declining invite:", error);
      res.status(500).json({ message: "Failed to decline invite" });
    }
  });

  app.delete('/api/group-voice/channel/:channelId', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { channelId } = req.params;

      await storage.deleteGroupVoiceChannel(channelId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting group voice channel:", error);
      res.status(500).json({ message: "Failed to delete channel" });
    }
  });

  app.get('/api/group-voice/:channelId/members', authMiddleware, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      let members = await storage.getGroupVoiceMembers(channelId);
      
      // Verify active status against HMS API
      const channel = await storage.getGroupVoiceChannel(channelId);
      if (channel && channel.hmsRoomId && hmsService.isConfigured()) {
        try {
          const activePeers = await hmsService.getActivePeers(channel.hmsRoomId);
          // Normalize peer user_ids to strings for comparison
          const activePeerUserIds = new Set(
            activePeers.map((peer: any) => String(peer.user_id || peer.userId))
          );
          
          // Update member isActive status based on HMS API response
          // Normalize member.userId to string for comparison
          members = members.map(member => ({
            ...member,
            isActive: activePeerUserIds.has(String(member.userId))
          }));
          
          console.log(`[HMS Verification] Channel ${channelId}: ${activePeerUserIds.size} active peers verified`);
        } catch (error) {
          console.error('Error verifying members with HMS API:', error);
          // Fall back to database status if HMS API fails
        }
      }
      
      res.json(members);
    } catch (error) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Remove member from voice channel (creator only)
  app.delete('/api/group-voice/:channelId/member/:userId', authMiddleware, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const { channelId, userId } = req.params;

      const channel = await storage.getGroupVoiceChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      if (channel.creatorId !== currentUserId) {
        return res.status(403).json({ message: "Only the creator can remove members" });
      }

      await storage.removeGroupVoiceMember(channelId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // DEMO ENDPOINT: Populate demo data for current user
  app.post('/api/demo/populate', authMiddleware, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      console.log(`📊 Creating demo data for user: ${currentUserId}`);

      // Get all users except current user
      const allUsers = await storage.getAllUsers({ limit: 100 });
      const dummyUsers = allUsers.users.filter(u => u.id !== currentUserId).slice(0, 5);

      if (dummyUsers.length === 0) {
        return res.status(400).json({ message: "Not enough dummy users available" });
      }

      let createdConnections = 0;
      let createdMessages = 0;
      let createdVoiceChannels = 0;
      const connectedUserIds: string[] = [];

      // Create accepted connections to first 3 dummy users
      for (let i = 0; i < Math.min(3, dummyUsers.length); i++) {
        const dummyUser = dummyUsers[i];
        
        try {
          // Create connection request (current user as sender)
          const connectionRequest = await storage.createConnectionRequest({
            senderId: currentUserId,
            receiverId: dummyUser.id,
          });

          // Accept the connection immediately
          await storage.updateConnectionRequestStatus(connectionRequest.id, 'accepted');
          createdConnections++;
          connectedUserIds.push(dummyUser.id);
          console.log(`✅ Created accepted connection with ${dummyUser.gamertag}`);

          // Create sample messages
          const messages = [
            "Hey! Looking forward to playing together!",
            "What's your rank in Valorant?",
            "I'm usually online after 8pm EST",
            "Let's queue up sometime this week!",
            "Down for some ranked matches?",
            "Your profile looks awesome!",
          ];

          for (let j = 0; j < 3; j++) {
            const isSenderFirst = j % 2 === 0;
            await storage.sendMessage({
              connectionId: connectionRequest.id,
              senderId: isSenderFirst ? currentUserId : dummyUser.id,
              receiverId: isSenderFirst ? dummyUser.id : currentUserId,
              message: messages[Math.floor(Math.random() * messages.length)],
            });
            createdMessages++;
          }
          console.log(`💬 Added 3 messages for connection with ${dummyUser.gamertag}`);
        } catch (error: any) {
          console.error(`Failed to create connection with ${dummyUser.gamertag}:`, error.message);
        }
      }

      // Create group voice channels for demo
      try {
        const channelNames = [
          "🎮 Tournament Practice",
          "🏆 Ranked 5-Stack",
          "⚔️ Scrimmage Team",
        ];
        
        for (const channelName of channelNames) {
          const groupChannel = await storage.createGroupVoiceChannel(channelName, currentUserId);

          // Add connected users to the voice channel
          for (const userId of connectedUserIds) {
            try {
              await storage.addGroupVoiceMember(groupChannel.id, userId);
              console.log(`👥 Added user to voice channel: ${channelName}`);
            } catch (error) {
              console.log(`Could not add user to voice channel (might already exist)`);
            }
          }

          createdVoiceChannels++;
          console.log(`🎙️ Created voice channel: ${channelName}`);
        }
      } catch (error: any) {
        console.error("Error creating voice channels:", error.message);
      }

      // Create match connections (applications) for remaining users
      let createdApplications = 0;
      for (let i = 3; i < Math.min(5, dummyUsers.length); i++) {
        const dummyUser = dummyUsers[i];
        
        try {
          // Get one of their match requests
          const theirRequests = await storage.getMatchRequests({ limit: 100 });
          const theirMatchRequest = theirRequests.matchRequests.find(mr => mr.userId === dummyUser.id);
          
          if (theirMatchRequest) {
            // Create match application (current user applying to their match)
            const matchConnection = await storage.createMatchConnection({
              requestId: theirMatchRequest.id,
              requesterId: currentUserId,
              accepterId: dummyUser.id,
            });

            // Accept it immediately (50% chance)
            if (Math.random() > 0.5) {
              await storage.updateMatchConnectionStatus(matchConnection.id, 'accepted');
            }
            createdApplications++;
            console.log(`🎮 Created match application with ${dummyUser.gamertag}`);
          }
        } catch (error: any) {
          console.error(`Failed to create match with ${dummyUser.gamertag}:`, error.message);
        }
      }

      console.log(`\n✨ Demo data created successfully!`);
      res.json({
        success: true,
        message: "Demo data populated successfully",
        stats: {
          connectionsCreated: createdConnections,
          messagesCreated: createdMessages,
          applicationsCreated: createdApplications,
          voiceChannelsCreated: createdVoiceChannels,
        }
      });
    } catch (error) {
      console.error("Error creating demo data:", error);
      res.status(500).json({ message: "Failed to create demo data", error: String(error) });
    }
  });

  return httpServer;
}
