import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./googleAuth";
import { devAuthMiddleware, ensureDevUser } from "./devAuth";
import { insertMatchRequestSchema, registerUserSchema, type RegisterUser } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { sendPushNotification } from "./pushNotifications";
import { r2Storage, generateFileKey } from "./services/r2-storage";
import { hmsService, generateRoomName } from "./services/hms-service";
import { sendSMS, generateVerificationCode, isPhoneAuthConfigured } from "./services/sms-service";
import { sendPhoneCodeSchema, verifyPhoneCodeSchema, phoneRegisterSchema } from "@shared/schema";

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
  
  // Local registration endpoint
  app.post('/api/auth/register', async (req: any, res) => {
    try {
      console.log("[REGISTER] Registration attempt:", { gamertag: req.body.gamertag });
      
      const validatedData = registerUserSchema.parse(req.body);
      console.log("[REGISTER] Data validated successfully");
      
      const existingUser = await storage.getUserByGamertag(validatedData.gamertag);
      if (existingUser) {
        console.log("[REGISTER] Gamertag already exists:", validatedData.gamertag);
        return res.status(400).json({ message: "Gamertag already taken" });
      }
      
      console.log("[REGISTER] Creating user...");
      const user = await storage.createLocalUser(validatedData);
      console.log("[REGISTER] User created successfully:", user.id);
      
      if (!req.login) {
        console.error("[REGISTER] CRITICAL: req.login is not available - Passport not initialized!");
        return res.status(500).json({ message: "Authentication system not properly configured" });
      }
      
      console.log("[REGISTER] Attempting to log in user...");
      req.login(user, (err: any) => {
        if (err) {
          console.error("[REGISTER] Login failed after registration:");
          console.error("  Error name:", err.name);
          console.error("  Error message:", err.message);
          console.error("  Error stack:", err.stack);
          return res.status(500).json({ 
            message: "Registration successful but login failed",
            error: err.message 
          });
        }
        console.log("[REGISTER] Login successful for user:", user.id);
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[REGISTER] Validation error:", error.errors);
        res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      } else if ((error as any).code === '23505') {
        console.error("[REGISTER] Database unique constraint violation");
        res.status(400).json({ message: "Gamertag or email already taken" });
      } else {
        console.error("[REGISTER] Unexpected error during registration:");
        console.error("  Error:", error);
        console.error("  Stack:", (error as Error).stack);
        res.status(500).json({ 
          message: "Failed to register user",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
  
  // Local login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { gamertag } = req.body;
      
      if (!gamertag) {
        return res.status(400).json({ message: "Gamertag is required" });
      }
      
      const user = await storage.getUserByGamertag(gamertag);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      req.login(user, (err: any) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  // Phone authentication endpoints
  const phoneVerificationRateLimit = new Map<string, { count: number; resetTime: number }>();
  const MAX_REQUESTS_PER_HOUR = 3;
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

  function checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const record = phoneVerificationRateLimit.get(phoneNumber);
    
    if (!record || now > record.resetTime) {
      phoneVerificationRateLimit.set(phoneNumber, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
    }
    
    if (record.count >= MAX_REQUESTS_PER_HOUR) {
      return false;
    }
    
    record.count++;
    return true;
  }

  app.post('/api/auth/phone/send-code', async (req, res) => {
    try {
      if (!isPhoneAuthConfigured()) {
        return res.status(503).json({ message: "Phone authentication is not configured on the server" });
      }

      const validatedData = sendPhoneCodeSchema.parse(req.body);
      const { phoneNumber } = validatedData;

      if (!checkRateLimit(phoneNumber)) {
        return res.status(429).json({ 
          message: "Too many verification attempts. Please try again later.",
          retryAfter: 3600
        });
      }

      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);
      if (existingUser) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createPhoneVerificationCode(phoneNumber, code, expiresAt);

      const message = `Your Nexus Match verification code is: ${code}. Valid for 10 minutes.`;
      const success = await sendSMS(phoneNumber, message);

      if (!success) {
        return res.status(500).json({ message: "Failed to send verification code" });
      }

      res.json({ 
        success: true, 
        message: "Verification code sent successfully",
        expiresIn: 600
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid phone number", errors: error.errors });
      } else {
        console.error("Error sending verification code:", error);
        res.status(500).json({ message: "Failed to send verification code" });
      }
    }
  });

  app.post('/api/auth/phone/verify-code', async (req, res) => {
    try {
      const validatedData = verifyPhoneCodeSchema.parse(req.body);
      const { phoneNumber, code } = validatedData;

      const isValid = await storage.verifyPhoneCode(phoneNumber, code);

      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      res.json({ 
        success: true, 
        message: "Phone number verified successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error verifying code:", error);
        res.status(500).json({ message: "Failed to verify code" });
      }
    }
  });

  app.post('/api/auth/phone/register', async (req: any, res) => {
    try {
      const validatedData = phoneRegisterSchema.parse(req.body);
      const { phoneNumber, verificationCode, gamertag, ...userData } = validatedData;

      const isVerified = await storage.verifyPhoneCode(phoneNumber, verificationCode);
      if (!isVerified) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
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

      await storage.deletePhoneVerificationCode(phoneNumber);

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
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.phoneVerified) {
        return res.status(401).json({ message: "Phone number not verified" });
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

  // User discovery routes
  app.get('/api/users', async (req, res) => {
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

  // Photo upload route
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage_multer = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      cb(null, uploadsDir);
    },
    filename: (req: any, file: any, cb: any) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
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

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  app.post('/api/upload-photo', authMiddleware, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
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
      
      // Broadcast to other participants
      const otherUserIds = participants
        .filter(p => p.userId !== userId)
        .map(p => p.userId);
      
      if (otherUserIds.length > 0) {
        (app as any).broadcast?.toUsers(otherUserIds, {
          type: 'voice_participant_joined',
          data: { connectionId, participant, participants },
          message: 'User joined voice channel'
        });
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

  // Set up WebSocket server for real-time match updates
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: (info: { origin: string; req: any }) => {
      // Validate Origin to prevent cross-site WebSocket hijacking
      const origin = info.origin;
      const host = info.req.headers.host;
      
      if (!origin || !host) {
        console.log('WebSocket connection rejected: Missing origin or host');
        return false;
      }
      
      try {
        // Extract hostname from origin using URL parsing for robustness
        const originHost = new URL(origin).host;
        
        // Allow same-origin connections
        if (originHost === host) {
          return true;
        }
        
        // Allow configured CORS origins (for split deployments like Vercel + Railway)
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
        const frontendUrl = process.env.FRONTEND_URL;
        
        // Check if origin matches CORS_ORIGIN or FRONTEND_URL
        if (frontendUrl) {
          try {
            const frontendHost = new URL(frontendUrl).host;
            if (originHost === frontendHost) {
              console.log(`WebSocket connection allowed from configured frontend: ${origin}`);
              return true;
            }
          } catch (e) {
            // Invalid FRONTEND_URL, ignore
          }
        }
        
        // Check if origin is in CORS_ORIGIN list
        if (allowedOrigins.some(allowed => {
          try {
            return new URL(allowed).host === originHost;
          } catch {
            return allowed === origin;
          }
        })) {
          console.log(`WebSocket connection allowed from CORS origin: ${origin}`);
          return true;
        }
        
        console.log(`WebSocket connection rejected: Origin ${origin} (${originHost}) does not match host ${host} or allowed origins`);
        return false;
      } catch (error) {
        console.log(`WebSocket connection rejected: Invalid origin URL ${origin}`);
        return false;
      }
    }
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
      const members = await storage.getGroupVoiceMembers(channelId);
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

  return httpServer;
}
