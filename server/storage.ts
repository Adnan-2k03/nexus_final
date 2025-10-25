import {
  users,
  matchRequests,
  matchConnections,
  connectionRequests,
  hiddenMatches,
  chatMessages,
  type User,
  type UpsertUser,
  type MatchRequest,
  type MatchRequestWithUser,
  type InsertMatchRequest,
  type MatchConnection,
  type MatchConnectionWithUser,
  type InsertMatchConnection,
  type ConnectionRequest,
  type ConnectionRequestWithUser,
  type InsertConnectionRequest,
  type HiddenMatch,
  type InsertHiddenMatch,
  type ChatMessage,
  type ChatMessageWithSender,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Gaming-focused storage interface with real-time capabilities
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(filters?: { search?: string; gender?: string; language?: string; game?: string; latitude?: number; longitude?: number; maxDistance?: number }): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserByGoogleId(user: { googleId: string; email: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User>;
  updateUserProfile(id: string, profile: Partial<User>): Promise<User>;
  
  // Match request operations
  getMatchRequests(filters?: { game?: string; mode?: string; region?: string; gender?: string; language?: string; latitude?: number; longitude?: number; maxDistance?: number }): Promise<MatchRequestWithUser[]>;
  createMatchRequest(request: InsertMatchRequest): Promise<MatchRequest>;
  updateMatchRequestStatus(id: string, status: "waiting" | "connected" | "declined"): Promise<MatchRequest>;
  deleteMatchRequest(id: string): Promise<void>;
  
  // Direct connection request operations (user-to-user, no match required)
  createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest>;
  updateConnectionRequestStatus(id: string, status: string): Promise<ConnectionRequest>;
  getConnectionRequests(userId: string): Promise<ConnectionRequestWithUser[]>;
  deleteConnectionRequest(id: string, userId: string): Promise<void>;
  
  // Match connection operations
  createMatchConnection(connection: InsertMatchConnection): Promise<MatchConnection>;
  updateMatchConnectionStatus(id: string, status: string): Promise<MatchConnection>;
  getUserConnections(userId: string): Promise<MatchConnectionWithUser[]>;
  deleteMatchConnection(id: string, userId: string): Promise<void>;
  
  // Hidden matches operations
  hideMatchRequest(userId: string, matchRequestId: string): Promise<HiddenMatch>;
  unhideMatchRequest(userId: string, matchRequestId: string): Promise<void>;
  getHiddenMatchIds(userId: string): Promise<string[]>;
  
  // Chat message operations
  sendMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getMessages(connectionId: string): Promise<ChatMessageWithSender[]>;
  getRecentMessages(userId: string): Promise<ChatMessageWithSender[]>;
}

// Database storage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getAllUsers(filters?: { search?: string; gender?: string; language?: string; game?: string; latitude?: number; longitude?: number; maxDistance?: number }): Promise<User[]> {
    const conditions = [];
    
    // Search filter (by name or gamertag)
    if (filters?.search) {
      conditions.push(
        or(
          ilike(users.gamertag, `%${filters.search}%`),
          ilike(users.firstName, `%${filters.search}%`),
          ilike(users.lastName, `%${filters.search}%`)
        )
      );
    }
    
    // Gender filter
    if (filters?.gender) {
      conditions.push(eq(users.gender, filters.gender as any));
    }
    
    // Language filter
    if (filters?.language) {
      conditions.push(eq(users.language, filters.language));
    }
    
    // Game filter (check if game is in preferredGames array)
    if (filters?.game) {
      conditions.push(sql`${filters.game} = ANY(${users.preferredGames})`);
    }
    
    // Fetch users
    let query = db.select().from(users);
    let allUsers: User[];
    
    if (conditions.length > 0) {
      allUsers = await query.where(and(...conditions));
    } else {
      allUsers = await query;
    }
    
    // Apply distance filter if coordinates are provided
    if (filters?.latitude != null && filters?.longitude != null && filters?.maxDistance != null) {
      allUsers = allUsers.filter(user => {
        if (user.latitude == null || user.longitude == null) return false;
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          user.latitude,
          user.longitude
        );
        return distance <= filters.maxDistance!;
      });
    }
    
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async upsertUserByGoogleId(userData: { googleId: string; email: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        googleId: userData.googleId,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
      })
      .onConflictDoUpdate({
        target: users.googleId,
        set: {
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profile: Partial<User>): Promise<User> {
    // Get current user to check if gamertag is actually changing
    const currentUser = await this.getUser(id);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // If gamertag hasn't changed, remove it from the update to avoid uniqueness check
    const updateData = { ...profile };
    if (updateData.gamertag && updateData.gamertag === currentUser.gamertag) {
      delete updateData.gamertag;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  // Match request operations
  async getMatchRequests(filters?: { game?: string; mode?: string; region?: string; gender?: string; language?: string; latitude?: number; longitude?: number; maxDistance?: number }): Promise<MatchRequestWithUser[]> {
    const matchConditions = [];
    const userConditions = [];
    
    // Match request filters
    if (filters?.game) {
      matchConditions.push(ilike(matchRequests.gameName, `%${filters.game}%`));
    }
    if (filters?.mode) {
      matchConditions.push(eq(matchRequests.gameMode, filters.mode));
    }
    if (filters?.region) {
      matchConditions.push(eq(matchRequests.region, filters.region));
    }
    
    // User profile filters
    if (filters?.gender) {
      userConditions.push(eq(users.gender, filters.gender as any));
    }
    if (filters?.language) {
      userConditions.push(eq(users.language, filters.language));
    }
    
    // Join with users table to get gamertag and profile data plus location
    const query = db
      .select({
        id: matchRequests.id,
        userId: matchRequests.userId,
        gameName: matchRequests.gameName,
        gameMode: matchRequests.gameMode,
        tournamentName: matchRequests.tournamentName,
        description: matchRequests.description,
        status: matchRequests.status,
        region: matchRequests.region,
        createdAt: matchRequests.createdAt,
        updatedAt: matchRequests.updatedAt,
        gamertag: users.gamertag,
        profileImageUrl: users.profileImageUrl,
        latitude: users.latitude,
        longitude: users.longitude,
      })
      .from(matchRequests)
      .leftJoin(users, eq(matchRequests.userId, users.id));
    
    // Combine all conditions
    const allConditions = [...matchConditions, ...userConditions];
    
    let requests;
    if (allConditions.length > 0) {
      requests = await query
        .where(and(...allConditions))
        .orderBy(desc(matchRequests.createdAt));
    } else {
      requests = await query
        .orderBy(desc(matchRequests.createdAt));
    }
    
    // Apply distance filter if coordinates are provided
    if (filters?.latitude != null && filters?.longitude != null && filters?.maxDistance != null) {
      requests = requests.filter(request => {
        if (request.latitude == null || request.longitude == null) return false;
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          request.latitude,
          request.longitude
        );
        return distance <= filters.maxDistance!;
      });
    }
    
    // Remove latitude/longitude from results (they were only needed for filtering)
    return requests.map(({ latitude, longitude, ...rest }) => rest) as MatchRequestWithUser[];
  }

  async createMatchRequest(requestData: InsertMatchRequest): Promise<MatchRequest> {
    const [request] = await db
      .insert(matchRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateMatchRequestStatus(id: string, status: "waiting" | "connected" | "declined"): Promise<MatchRequest> {
    const [updatedRequest] = await db
      .update(matchRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(matchRequests.id, id))
      .returning();
    
    if (!updatedRequest) {
      throw new Error('Match request not found');
    }
    
    return updatedRequest;
  }

  async deleteMatchRequest(id: string): Promise<void> {
    await db.delete(matchRequests).where(eq(matchRequests.id, id));
  }

  // Direct connection request operations
  async createConnectionRequest(requestData: InsertConnectionRequest): Promise<ConnectionRequest> {
    const [request] = await db
      .insert(connectionRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateConnectionRequestStatus(id: string, status: string): Promise<ConnectionRequest> {
    const [updatedRequest] = await db
      .update(connectionRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(connectionRequests.id, id))
      .returning();
    
    if (!updatedRequest) {
      throw new Error('Connection request not found');
    }
    
    return updatedRequest;
  }

  async getConnectionRequests(userId: string): Promise<ConnectionRequestWithUser[]> {
    const sender = alias(users, 'sender');
    const receiver = alias(users, 'receiver');
    
    const requests = await db
      .select({
        id: connectionRequests.id,
        senderId: connectionRequests.senderId,
        receiverId: connectionRequests.receiverId,
        status: connectionRequests.status,
        createdAt: connectionRequests.createdAt,
        updatedAt: connectionRequests.updatedAt,
        senderGamertag: sql<string | null>`${sender.gamertag}`,
        senderProfileImageUrl: sql<string | null>`${sender.profileImageUrl}`,
        receiverGamertag: sql<string | null>`${receiver.gamertag}`,
        receiverProfileImageUrl: sql<string | null>`${receiver.profileImageUrl}`,
      })
      .from(connectionRequests)
      .leftJoin(sender, eq(connectionRequests.senderId, sender.id))
      .leftJoin(receiver, eq(connectionRequests.receiverId, receiver.id))
      .where(or(
        eq(connectionRequests.senderId, userId),
        eq(connectionRequests.receiverId, userId)
      ))
      .orderBy(desc(connectionRequests.createdAt));
    
    return requests;
  }

  async deleteConnectionRequest(id: string, userId: string): Promise<void> {
    // First verify the user is authorized to delete this request
    const [request] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, id));
    
    if (!request) {
      throw new Error('Connection request not found');
    }
    
    // Only the sender or receiver can delete the request
    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new Error('Unauthorized to delete this connection request');
    }
    
    await db.delete(connectionRequests).where(eq(connectionRequests.id, id));
  }

  // Match connection operations
  async createMatchConnection(connectionData: InsertMatchConnection): Promise<MatchConnection> {
    const [connection] = await db
      .insert(matchConnections)
      .values(connectionData)
      .returning();
    return connection;
  }

  async updateMatchConnectionStatus(id: string, status: string): Promise<MatchConnection> {
    const [updatedConnection] = await db
      .update(matchConnections)
      .set({ status, updatedAt: new Date() })
      .where(eq(matchConnections.id, id))
      .returning();
    
    if (!updatedConnection) {
      throw new Error('Match connection not found');
    }
    
    return updatedConnection;
  }

  async getUserConnections(userId: string): Promise<MatchConnectionWithUser[]> {
    const requester = alias(users, 'requester');
    const accepter = alias(users, 'accepter');
    
    const connections = await db
      .select({
        id: matchConnections.id,
        requestId: matchConnections.requestId,
        requesterId: matchConnections.requesterId,
        accepterId: matchConnections.accepterId,
        status: matchConnections.status,
        createdAt: matchConnections.createdAt,
        updatedAt: matchConnections.updatedAt,
        requesterGamertag: sql<string | null>`${requester.gamertag}`,
        requesterProfileImageUrl: sql<string | null>`${requester.profileImageUrl}`,
        accepterGamertag: sql<string | null>`${accepter.gamertag}`,
        accepterProfileImageUrl: sql<string | null>`${accepter.profileImageUrl}`,
        gameName: sql<string | null>`${matchRequests.gameName}`,
        gameMode: sql<string | null>`${matchRequests.gameMode}`,
      })
      .from(matchConnections)
      .leftJoin(requester, eq(matchConnections.requesterId, requester.id))
      .leftJoin(accepter, eq(matchConnections.accepterId, accepter.id))
      .leftJoin(matchRequests, eq(matchConnections.requestId, matchRequests.id))
      .where(or(
        eq(matchConnections.requesterId, userId),
        eq(matchConnections.accepterId, userId)
      ))
      .orderBy(desc(matchConnections.createdAt));
    
    return connections;
  }

  async deleteMatchConnection(id: string, userId: string): Promise<void> {
    // First verify the user is authorized to delete this connection
    const [connection] = await db
      .select()
      .from(matchConnections)
      .where(eq(matchConnections.id, id));
    
    if (!connection) {
      throw new Error('Match connection not found');
    }
    
    // Only the requester or accepter can delete the connection
    if (connection.requesterId !== userId && connection.accepterId !== userId) {
      throw new Error('Unauthorized to delete this match connection');
    }
    
    await db.delete(matchConnections).where(eq(matchConnections.id, id));
  }

  // Hidden matches operations
  async hideMatchRequest(userId: string, matchRequestId: string): Promise<HiddenMatch> {
    const [hidden] = await db
      .insert(hiddenMatches)
      .values({ userId, matchRequestId })
      .onConflictDoNothing()
      .returning();
    return hidden;
  }

  async unhideMatchRequest(userId: string, matchRequestId: string): Promise<void> {
    await db
      .delete(hiddenMatches)
      .where(and(
        eq(hiddenMatches.userId, userId),
        eq(hiddenMatches.matchRequestId, matchRequestId)
      ));
  }

  async getHiddenMatchIds(userId: string): Promise<string[]> {
    const hidden = await db
      .select({ matchRequestId: hiddenMatches.matchRequestId })
      .from(hiddenMatches)
      .where(eq(hiddenMatches.userId, userId));
    
    return hidden.map(h => h.matchRequestId);
  }

  // Chat message operations
  async sendMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getMessages(connectionId: string): Promise<ChatMessageWithSender[]> {
    const messages = await db
      .select({
        id: chatMessages.id,
        connectionId: chatMessages.connectionId,
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        senderGamertag: users.gamertag,
        senderProfileImageUrl: users.profileImageUrl,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.connectionId, connectionId))
      .orderBy(chatMessages.createdAt);
    
    return messages;
  }

  async getRecentMessages(userId: string): Promise<ChatMessageWithSender[]> {
    // Get all connections where user is participant
    const userConnections = await this.getUserConnections(userId);
    const connectionIds = userConnections.map(c => c.id);
    
    if (connectionIds.length === 0) {
      return [];
    }
    
    // Get messages from all connections
    const messages = await db
      .select({
        id: chatMessages.id,
        connectionId: chatMessages.connectionId,
        senderId: chatMessages.senderId,
        receiverId: chatMessages.receiverId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        senderGamertag: users.gamertag,
        senderProfileImageUrl: users.profileImageUrl,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(or(...connectionIds.map(id => eq(chatMessages.connectionId, id))))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);
    
    return messages;
  }
}

export const storage = new DatabaseStorage();

// Note: Seed data removed - users will sign in with Google OAuth
// Real match requests will be created by authenticated users