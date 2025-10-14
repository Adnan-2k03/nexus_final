import {
  users,
  matchRequests,
  matchConnections,
  hiddenMatches,
  chatMessages,
  type User,
  type UpsertUser,
  type MatchRequest,
  type MatchRequestWithUser,
  type InsertMatchRequest,
  type MatchConnection,
  type InsertMatchConnection,
  type HiddenMatch,
  type InsertHiddenMatch,
  type ChatMessage,
  type ChatMessageWithSender,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// Gaming-focused storage interface with real-time capabilities
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserByGoogleId(user: { googleId: string; email: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User>;
  updateUserProfile(id: string, profile: Partial<User>): Promise<User>;
  
  // Match request operations
  getMatchRequests(filters?: { game?: string; mode?: string; region?: string }): Promise<MatchRequestWithUser[]>;
  createMatchRequest(request: InsertMatchRequest): Promise<MatchRequest>;
  updateMatchRequestStatus(id: string, status: "waiting" | "connected" | "declined"): Promise<MatchRequest>;
  deleteMatchRequest(id: string): Promise<void>;
  
  // Match connection operations
  createMatchConnection(connection: InsertMatchConnection): Promise<MatchConnection>;
  updateMatchConnectionStatus(id: string, status: string): Promise<MatchConnection>;
  getUserConnections(userId: string): Promise<MatchConnection[]>;
  
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
    const [updatedUser] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  // Match request operations
  async getMatchRequests(filters?: { game?: string; mode?: string; region?: string }): Promise<MatchRequestWithUser[]> {
    const conditions = [];
    
    if (filters?.game) {
      conditions.push(ilike(matchRequests.gameName, `%${filters.game}%`));
    }
    if (filters?.mode) {
      conditions.push(eq(matchRequests.gameMode, filters.mode));
    }
    if (filters?.region) {
      conditions.push(eq(matchRequests.region, filters.region));
    }
    
    // Join with users table to get gamertag and profile data
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
      })
      .from(matchRequests)
      .leftJoin(users, eq(matchRequests.userId, users.id));
    
    if (conditions.length > 0) {
      const requests = await query
        .where(and(...conditions))
        .orderBy(desc(matchRequests.createdAt));
      return requests;
    } else {
      const requests = await query
        .orderBy(desc(matchRequests.createdAt));
      return requests;
    }
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

  async getUserConnections(userId: string): Promise<MatchConnection[]> {
    const connections = await db
      .select()
      .from(matchConnections)
      .where(or(
        eq(matchConnections.requesterId, userId),
        eq(matchConnections.accepterId, userId)
      ))
      .orderBy(desc(matchConnections.createdAt));
    
    return connections;
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