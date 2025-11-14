import {
  users,
  matchRequests,
  matchConnections,
  connectionRequests,
  hiddenMatches,
  chatMessages,
  notifications,
  gameProfiles,
  hobbies,
  voiceChannels,
  voiceParticipants,
  groupVoiceChannels,
  groupVoiceMembers,
  groupVoiceInvites,
  pushSubscriptions,
  phoneVerificationCodes,
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
  type Notification,
  type InsertNotification,
  type GameProfile,
  type InsertGameProfile,
  type Hobby,
  type InsertHobby,
  type VoiceChannel,
  type InsertVoiceChannel,
  type VoiceParticipant,
  type VoiceParticipantWithUser,
  type InsertVoiceParticipant,
  type GroupVoiceChannel,
  type GroupVoiceChannelWithDetails,
  type InsertGroupVoiceChannel,
  type GroupVoiceMember,
  type GroupVoiceMemberWithUser,
  type InsertGroupVoiceMember,
  type GroupVoiceInvite,
  type GroupVoiceInviteWithUser,
  type InsertGroupVoiceInvite,
  type PushSubscription,
  type InsertPushSubscription,
  type PhoneVerificationCode,
  type InsertPhoneVerificationCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, sql, ne, notInArray } from "drizzle-orm";
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
  getUserByGamertag(gamertag: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(filters?: { search?: string; gender?: string; language?: string; game?: string; rank?: string; latitude?: number; longitude?: number; maxDistance?: number; page?: number; limit?: number }): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }>;
  getUserCount(): Promise<number>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserByGoogleId(user: { googleId: string; email: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User>;
  createLocalUser(userData: { gamertag: string; firstName?: string | null; lastName?: string | null; email?: string | null; age?: number | null; gender?: "male" | "female" | "custom" | "prefer_not_to_say" | null; bio?: string | null; location?: string | null; preferredGames?: string[] | null }): Promise<User>;
  createPhoneUser(userData: { phoneNumber: string; gamertag: string; firstName?: string | null; lastName?: string | null; age?: number | null; gender?: "male" | "female" | "custom" | "prefer_not_to_say" | null; bio?: string | null; location?: string | null; preferredGames?: string[] | null }): Promise<User>;
  updateUserProfile(id: string, profile: Partial<User>): Promise<User>;
  updatePrivacySettings(id: string, settings: { showMutualGames?: string; showMutualFriends?: string; showMutualHobbies?: string }): Promise<User>;
  
  // Phone verification operations
  createPhoneVerificationCode(phoneNumber: string, code: string, expiresAt: Date): Promise<PhoneVerificationCode>;
  getPhoneVerificationCode(phoneNumber: string): Promise<PhoneVerificationCode | undefined>;
  verifyPhoneCode(phoneNumber: string, code: string): Promise<boolean>;
  incrementVerificationAttempts(id: string): Promise<void>;
  deletePhoneVerificationCode(phoneNumber: string): Promise<void>;
  cleanupExpiredVerificationCodes(): Promise<void>;
  
  // Match request operations
  getMatchRequests(filters?: { game?: string; mode?: string; region?: string; gender?: string; language?: string; rank?: string; latitude?: number; longitude?: number; maxDistance?: number; page?: number; limit?: number }): Promise<{ matchRequests: MatchRequestWithUser[]; total: number; page: number; limit: number; totalPages: number }>;
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
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  deleteAllNotifications(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Push subscription operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string, userId: string): Promise<void>;
  
  // Game profile operations
  createGameProfile(profile: InsertGameProfile): Promise<GameProfile>;
  updateGameProfile(id: string, profile: Partial<GameProfile>): Promise<GameProfile>;
  getUserGameProfiles(userId: string): Promise<GameProfile[]>;
  getGameProfile(id: string): Promise<GameProfile | undefined>;
  deleteGameProfile(id: string, userId: string): Promise<void>;
  
  // Hobby/Interest operations
  createHobby(hobby: InsertHobby): Promise<Hobby>;
  updateHobby(id: string, hobby: Partial<Hobby>): Promise<Hobby>;
  getUserHobbies(userId: string, category?: string): Promise<Hobby[]>;
  getHobby(id: string): Promise<Hobby | undefined>;
  deleteHobby(id: string, userId: string): Promise<void>;
  
  // Mutuals calculation
  getMutualGames(userId1: string, userId2: string): Promise<string[]>;
  getMutualFriends(userId1: string, userId2: string): Promise<User[]>;
  getMutualHobbies(userId1: string, userId2: string): Promise<{category: string; count: number}[]>;
  
  // Voice channel operations
  getOrCreateVoiceChannel(connectionId: string, hmsRoomId?: string): Promise<VoiceChannel>;
  getVoiceChannel(connectionId: string): Promise<VoiceChannel | undefined>;
  updateVoiceChannelRoomId(voiceChannelId: string, hmsRoomId: string): Promise<VoiceChannel>;
  deleteVoiceChannel(voiceChannelId: string): Promise<void>;
  joinVoiceChannel(voiceChannelId: string, userId: string): Promise<VoiceParticipant>;
  leaveVoiceChannel(voiceChannelId: string, userId: string): Promise<void>;
  getVoiceParticipants(voiceChannelId: string): Promise<VoiceParticipantWithUser[]>;
  updateParticipantMuteStatus(voiceChannelId: string, userId: string, isMuted: boolean): Promise<VoiceParticipant>;
  getUserActiveVoiceChannel(userId: string): Promise<VoiceChannel | undefined>;

  // Group voice channel operations
  createGroupVoiceChannel(name: string, creatorId: string, hmsRoomId?: string): Promise<GroupVoiceChannel>;
  getGroupVoiceChannel(id: string): Promise<GroupVoiceChannel | undefined>;
  getGroupVoiceChannelByInvite(inviteCode: string): Promise<GroupVoiceChannel | undefined>;
  getGroupVoiceChannelByInviteWithDetails(inviteCode: string): Promise<GroupVoiceChannelWithDetails | undefined>;
  getUserGroupVoiceChannels(userId: string): Promise<GroupVoiceChannelWithDetails[]>;
  updateGroupVoiceChannelRoomId(channelId: string, hmsRoomId: string): Promise<GroupVoiceChannel>;
  deleteGroupVoiceChannel(channelId: string, userId: string): Promise<void>;
  addGroupVoiceMember(channelId: string, userId: string): Promise<GroupVoiceMember>;
  removeGroupVoiceMember(channelId: string, userId: string): Promise<void>;
  getGroupVoiceMembers(channelId: string): Promise<GroupVoiceMemberWithUser[]>;
  setGroupMemberActive(channelId: string, userId: string, isActive: boolean): Promise<GroupVoiceMember>;
  setGroupMemberMuted(channelId: string, userId: string, isMuted: boolean): Promise<GroupVoiceMember>;
  cleanupUserActiveStatus(userId: string): Promise<void>;
  
  // Group voice channel invite operations
  createGroupVoiceInvite(channelId: string, inviterId: string, inviteeId: string): Promise<GroupVoiceInvite>;
  getPendingGroupVoiceInvites(userId: string): Promise<GroupVoiceInviteWithUser[]>;
  getGroupVoiceInvite(inviteId: string): Promise<GroupVoiceInvite | undefined>;
  hasExistingPendingInvite(channelId: string, inviteeId: string): Promise<boolean>;
  acceptGroupVoiceInvite(inviteId: string): Promise<void>;
  declineGroupVoiceInvite(inviteId: string): Promise<void>;
}

// Database storage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getAllUsers(filters?: { search?: string; gender?: string; language?: string; game?: string; rank?: string; latitude?: number; longitude?: number; maxDistance?: number; page?: number; limit?: number; excludeUserId?: string; excludeUserIds?: string[] }): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const conditions = [];
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    // Exclude current user
    if (filters?.excludeUserId) {
      conditions.push(ne(users.id, filters.excludeUserId));
    }
    
    // Exclude connected users
    if (filters?.excludeUserIds && filters.excludeUserIds.length > 0) {
      conditions.push(notInArray(users.id, filters.excludeUserIds));
    }
    
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
    
    // Build base query
    let baseQuery = db.select().from(users);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(users);
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    
    // Determine if we need distance filtering
    const hasDistanceFilter = filters?.latitude != null && filters?.longitude != null && filters?.maxDistance != null;
    
    // Fetch users with pagination
    // If distance filtering is needed, fetch more users to ensure we have enough after filtering
    const fetchLimit = hasDistanceFilter ? limit * 5 : limit;
    let fetchedUsers = await baseQuery
      .orderBy(desc(users.createdAt))
      .limit(fetchLimit)
      .offset(offset);
    
    // Apply distance filter if coordinates are provided (post-query filtering)
    if (hasDistanceFilter) {
      fetchedUsers = fetchedUsers.filter(user => {
        if (user.latitude == null || user.longitude == null) return false;
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          user.latitude,
          user.longitude
        );
        return distance <= filters.maxDistance!;
      });
      
      // Limit to exact page size after filtering
      fetchedUsers = fetchedUsers.slice(0, limit);
    }
    
    // Get total count
    const [countResult] = await countQuery;
    let total = countResult?.count || 0;
    
    // If distance filtering is applied, adjust total to reflect filtered count
    if (hasDistanceFilter) {
      // Fetch all users that match other filters to get accurate total
      const allUsers = await baseQuery.orderBy(desc(users.createdAt));
      const filteredUsers = allUsers.filter(user => {
        if (user.latitude == null || user.longitude == null) return false;
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          user.latitude,
          user.longitude
        );
        return distance <= filters.maxDistance!;
      });
      total = filteredUsers.length;
    }
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      users: fetchedUsers,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    return result[0]?.count || 0;
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
    const baseGamertag = userData.email?.split('@')[0] || userData.googleId;
    let gamertag = baseGamertag;
    let suffix = 0;
    
    while (true) {
      try {
        const [user] = await db
          .insert(users)
          .values({
            googleId: userData.googleId,
            email: userData.email,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            profileImageUrl: userData.profileImageUrl || null,
            gamertag,
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
      } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'users_gamertag_unique') {
          suffix++;
          gamertag = `${baseGamertag}${suffix}`;
        } else {
          throw error;
        }
      }
    }
  }
  
  async createLocalUser(userData: { gamertag: string; firstName?: string | null; lastName?: string | null; email?: string | null; age?: number | null; gender?: "male" | "female" | "custom" | "prefer_not_to_say" | null; bio?: string | null; location?: string | null; preferredGames?: string[] | null }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        gamertag: userData.gamertag,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        email: userData.email || null,
        age: userData.age || null,
        gender: userData.gender || null,
        bio: userData.bio || null,
        location: userData.location || null,
        preferredGames: userData.preferredGames || null,
      })
      .returning();
    return user;
  }
  
  async getUserByGamertag(gamertag: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.gamertag, gamertag));
    return user || undefined;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createPhoneUser(userData: { phoneNumber: string; gamertag: string; firstName?: string | null; lastName?: string | null; age?: number | null; gender?: "male" | "female" | "custom" | "prefer_not_to_say" | null; bio?: string | null; location?: string | null; preferredGames?: string[] | null }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        phoneNumber: userData.phoneNumber,
        phoneVerified: true,
        gamertag: userData.gamertag,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        age: userData.age || null,
        gender: userData.gender || null,
        bio: userData.bio || null,
        location: userData.location || null,
        preferredGames: userData.preferredGames || null,
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

  async updatePrivacySettings(id: string, settings: { showMutualGames?: string; showMutualFriends?: string; showMutualHobbies?: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  // Phone verification operations
  async createPhoneVerificationCode(phoneNumber: string, code: string, expiresAt: Date): Promise<PhoneVerificationCode> {
    await db.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phoneNumber, phoneNumber));
    
    const [verificationCode] = await db
      .insert(phoneVerificationCodes)
      .values({
        phoneNumber,
        code,
        expiresAt,
        verified: false,
        attempts: 0,
      })
      .returning();
    
    return verificationCode;
  }

  async getPhoneVerificationCode(phoneNumber: string): Promise<PhoneVerificationCode | undefined> {
    const [code] = await db
      .select()
      .from(phoneVerificationCodes)
      .where(
        and(
          eq(phoneVerificationCodes.phoneNumber, phoneNumber),
          eq(phoneVerificationCodes.verified, false)
        )
      )
      .orderBy(desc(phoneVerificationCodes.createdAt))
      .limit(1);
    
    return code || undefined;
  }

  async verifyPhoneCode(phoneNumber: string, code: string): Promise<boolean> {
    const verificationCode = await this.getPhoneVerificationCode(phoneNumber);
    
    if (!verificationCode) {
      return false;
    }

    if (new Date() > verificationCode.expiresAt) {
      return false;
    }

    if (verificationCode.code !== code) {
      await this.incrementVerificationAttempts(verificationCode.id);
      return false;
    }

    await db
      .update(phoneVerificationCodes)
      .set({ verified: true })
      .where(eq(phoneVerificationCodes.id, verificationCode.id));
    
    return true;
  }

  async incrementVerificationAttempts(id: string): Promise<void> {
    await db
      .update(phoneVerificationCodes)
      .set({ attempts: sql`${phoneVerificationCodes.attempts} + 1` })
      .where(eq(phoneVerificationCodes.id, id));
  }

  async deletePhoneVerificationCode(phoneNumber: string): Promise<void> {
    await db.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phoneNumber, phoneNumber));
  }

  async cleanupExpiredVerificationCodes(): Promise<void> {
    await db
      .delete(phoneVerificationCodes)
      .where(sql`${phoneVerificationCodes.expiresAt} < NOW()`);
  }

  // Match request operations
  async getMatchRequests(filters?: { game?: string; mode?: string; region?: string; gender?: string; language?: string; rank?: string; latitude?: number; longitude?: number; maxDistance?: number; page?: number; limit?: number }): Promise<{ matchRequests: MatchRequestWithUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const matchConditions = [];
    const userConditions = [];
    const gameProfileConditions = [];
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
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
    
    // Game profile filters (rank)
    if (filters?.rank) {
      gameProfileConditions.push(
        or(
          eq(gameProfiles.currentRank, filters.rank),
          eq(gameProfiles.highestRank, filters.rank)
        )
      );
    }
    
    // Combine all conditions
    const allConditions = [...matchConditions, ...userConditions, ...gameProfileConditions];
    
    // Join with users table to get gamertag and profile data plus location
    // Join with game profiles if rank filter is applied
    let query = db
      .select({
        id: matchRequests.id,
        userId: matchRequests.userId,
        gameName: matchRequests.gameName,
        gameMode: matchRequests.gameMode,
        matchType: matchRequests.matchType,
        duration: matchRequests.duration,
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
    
    // Add game profile join if rank filter is present
    if (filters?.rank) {
      query = query.leftJoin(
        gameProfiles, 
        and(
          eq(gameProfiles.userId, matchRequests.userId),
          eq(gameProfiles.gameName, matchRequests.gameName)
        )
      ) as any;
    }
    
    // Count query for total
    let countQuery = db
      .select({ count: sql<number>`count(DISTINCT ${matchRequests.id})::int` })
      .from(matchRequests)
      .leftJoin(users, eq(matchRequests.userId, users.id));
    
    // Add game profile join to count query if rank filter is present
    if (filters?.rank) {
      countQuery = countQuery.leftJoin(
        gameProfiles,
        and(
          eq(gameProfiles.userId, matchRequests.userId),
          eq(gameProfiles.gameName, matchRequests.gameName)
        )
      ) as any;
    }
    
    if (allConditions.length > 0) {
      query = query.where(and(...allConditions)) as any;
      countQuery = countQuery.where(and(...allConditions)) as any;
    }
    
    // Fetch with pagination
    let requests = await query
      .orderBy(desc(matchRequests.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Apply distance filter if coordinates are provided (post-query filtering)
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
    
    // Get total count
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    // Remove latitude/longitude from results (they were only needed for filtering)
    const cleanedRequests = requests.map(({ latitude, longitude, ...rest }) => rest) as MatchRequestWithUser[];
    
    return {
      matchRequests: cleanedRequests,
      total,
      page,
      limit,
      totalPages
    };
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
    
    // Delete associated chat messages first
    await db.delete(chatMessages).where(eq(chatMessages.connectionId, id));
    
    // Then delete the connection request
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
    
    // Delete associated chat messages first
    await db.delete(chatMessages).where(eq(chatMessages.connectionId, id));
    
    // Then delete the match connection
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

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    
    return userNotifications;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification> {
    // Verify the user owns this notification
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.userId !== userId) {
      throw new Error('Unauthorized to modify this notification');
    }
    
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    // Verify the user owns this notification
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.userId !== userId) {
      throw new Error('Unauthorized to delete this notification');
    }
    
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result[0]?.count || 0;
  }

  // Push subscription operations
  async createPushSubscription(subscriptionData: InsertPushSubscription): Promise<PushSubscription> {
    try {
      const [subscription] = await db
        .insert(pushSubscriptions)
        .values(subscriptionData)
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            p256dh: subscriptionData.p256dh,
            auth: subscriptionData.auth,
          }
        })
        .returning();
      return subscription;
    } catch (error) {
      throw error;
    }
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    return subscriptions;
  }

  async deletePushSubscription(endpoint: string, userId: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId)
      ));
  }

  // Game profile operations
  async createGameProfile(profileData: InsertGameProfile): Promise<GameProfile> {
    const [profile] = await db
      .insert(gameProfiles)
      .values(profileData)
      .returning();
    return profile;
  }

  async updateGameProfile(id: string, profileData: Partial<GameProfile>): Promise<GameProfile> {
    const [updatedProfile] = await db
      .update(gameProfiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(gameProfiles.id, id))
      .returning();
    
    if (!updatedProfile) {
      throw new Error('Game profile not found');
    }
    
    return updatedProfile;
  }

  async getUserGameProfiles(userId: string): Promise<GameProfile[]> {
    const profiles = await db
      .select()
      .from(gameProfiles)
      .where(eq(gameProfiles.userId, userId))
      .orderBy(desc(gameProfiles.updatedAt));
    
    return profiles;
  }

  async getGameProfile(id: string): Promise<GameProfile | undefined> {
    const [profile] = await db
      .select()
      .from(gameProfiles)
      .where(eq(gameProfiles.id, id));
    return profile || undefined;
  }

  async deleteGameProfile(id: string, userId: string): Promise<void> {
    // First verify the user owns this game profile
    const [profile] = await db
      .select()
      .from(gameProfiles)
      .where(eq(gameProfiles.id, id));
    
    if (!profile) {
      throw new Error('Game profile not found');
    }
    
    if (profile.userId !== userId) {
      throw new Error('Unauthorized to delete this game profile');
    }
    
    await db.delete(gameProfiles).where(eq(gameProfiles.id, id));
  }

  // Hobby/Interest operations
  async createHobby(hobbyData: InsertHobby): Promise<Hobby> {
    const [newHobby] = await db
      .insert(hobbies)
      .values({
        ...hobbyData,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newHobby;
  }

  async updateHobby(id: string, hobbyData: Partial<Hobby>): Promise<Hobby> {
    const [updatedHobby] = await db
      .update(hobbies)
      .set({ ...hobbyData, updatedAt: new Date() })
      .where(eq(hobbies.id, id))
      .returning();
    
    if (!updatedHobby) {
      throw new Error('Hobby not found');
    }
    
    return updatedHobby;
  }

  async getUserHobbies(userId: string, category?: string): Promise<Hobby[]> {
    const conditions = [eq(hobbies.userId, userId)];
    
    if (category) {
      conditions.push(eq(hobbies.category, category));
    }
    
    const userHobbies = await db
      .select()
      .from(hobbies)
      .where(and(...conditions))
      .orderBy(desc(hobbies.updatedAt));
    
    return userHobbies;
  }

  async getHobby(id: string): Promise<Hobby | undefined> {
    const [hobby] = await db
      .select()
      .from(hobbies)
      .where(eq(hobbies.id, id));
    return hobby || undefined;
  }

  async deleteHobby(id: string, userId: string): Promise<void> {
    // First verify the user owns this hobby
    const [hobby] = await db
      .select()
      .from(hobbies)
      .where(eq(hobbies.id, id));
    
    if (!hobby) {
      throw new Error('Hobby not found');
    }
    
    if (hobby.userId !== userId) {
      throw new Error('Unauthorized to delete this hobby');
    }
    
    await db.delete(hobbies).where(eq(hobbies.id, id));
  }

  // Mutuals calculation
  async getMutualGames(userId1: string, userId2: string): Promise<string[]> {
    const [user1, user2] = await Promise.all([
      this.getUser(userId1),
      this.getUser(userId2),
    ]);
    
    if (!user1 || !user2) return [];
    
    const games1 = user1.preferredGames || [];
    const games2 = user2.preferredGames || [];
    
    return games1.filter(game => games2.includes(game));
  }

  async getMutualFriends(userId1: string, userId2: string): Promise<User[]> {
    // Get all accepted connections for both users
    const [connections1, connections2] = await Promise.all([
      db.select().from(connectionRequests)
        .where(
          and(
            or(
              eq(connectionRequests.senderId, userId1),
              eq(connectionRequests.receiverId, userId1)
            ),
            eq(connectionRequests.status, 'accepted')
          )
        ),
      db.select().from(connectionRequests)
        .where(
          and(
            or(
              eq(connectionRequests.senderId, userId2),
              eq(connectionRequests.receiverId, userId2)
            ),
            eq(connectionRequests.status, 'accepted')
          )
        ),
    ]);
    
    // Extract user IDs from connections
    const friends1 = connections1.map(c => c.senderId === userId1 ? c.receiverId : c.senderId);
    const friends2 = connections2.map(c => c.senderId === userId2 ? c.receiverId : c.senderId);
    
    // Find mutual friend IDs
    const mutualFriendIds = friends1.filter(id => friends2.includes(id));
    
    // Fetch user details for mutual friends
    if (mutualFriendIds.length === 0) return [];
    
    const mutualFriends = await db.select().from(users)
      .where(or(...mutualFriendIds.map(id => eq(users.id, id))));
    
    return mutualFriends;
  }

  async getMutualHobbies(userId1: string, userId2: string): Promise<{category: string; count: number}[]> {
    const [hobbies1, hobbies2] = await Promise.all([
      this.getUserHobbies(userId1),
      this.getUserHobbies(userId2),
    ]);
    
    // Group by category and count mutual hobbies
    const categories1 = hobbies1.map(h => h.category);
    const categories2 = hobbies2.map(h => h.category);
    
    const mutualCategories = Array.from(new Set(categories1.filter(c => categories2.includes(c))));
    
    return mutualCategories.map(category => ({
      category,
      count: hobbies1.filter(h => h.category === category).length +
             hobbies2.filter(h => h.category === category).length
    }));
  }

  // Voice channel operations
  async getOrCreateVoiceChannel(connectionId: string, hmsRoomId?: string): Promise<VoiceChannel> {
    // First try to get existing channel
    const existing = await this.getVoiceChannel(connectionId);
    if (existing) return existing;
    
    // Use INSERT ... ON CONFLICT to handle race conditions
    const [channel] = await db
      .insert(voiceChannels)
      .values({ connectionId, hmsRoomId })
      .onConflictDoUpdate({
        target: voiceChannels.connectionId,
        set: { 
          hmsRoomId: hmsRoomId ? sql`EXCLUDED.hms_room_id` : sql`voice_channels.hms_room_id`
        }
      })
      .returning();
    return channel;
  }

  async updateVoiceChannelRoomId(voiceChannelId: string, hmsRoomId: string): Promise<VoiceChannel> {
    const [channel] = await db
      .update(voiceChannels)
      .set({ hmsRoomId })
      .where(eq(voiceChannels.id, voiceChannelId))
      .returning();
    return channel;
  }

  async getVoiceChannel(connectionId: string): Promise<VoiceChannel | undefined> {
    const [channel] = await db
      .select()
      .from(voiceChannels)
      .where(eq(voiceChannels.connectionId, connectionId));
    return channel || undefined;
  }

  async deleteVoiceChannel(voiceChannelId: string): Promise<void> {
    await db.delete(voiceChannels).where(eq(voiceChannels.id, voiceChannelId));
  }

  async joinVoiceChannel(voiceChannelId: string, userId: string): Promise<VoiceParticipant> {
    // Check if user is already in this channel
    const [existing] = await db
      .select()
      .from(voiceParticipants)
      .where(
        and(
          eq(voiceParticipants.voiceChannelId, voiceChannelId),
          eq(voiceParticipants.userId, userId)
        )
      );
    
    if (existing) return existing;
    
    // Add user to channel with ON CONFLICT to handle race conditions
    const [participant] = await db
      .insert(voiceParticipants)
      .values({ voiceChannelId, userId, isMuted: false })
      .onConflictDoUpdate({
        target: [voiceParticipants.voiceChannelId, voiceParticipants.userId],
        set: { joinedAt: sql`EXCLUDED.joined_at` }
      })
      .returning();
    
    return participant;
  }

  async leaveVoiceChannel(voiceChannelId: string, userId: string): Promise<void> {
    await db
      .delete(voiceParticipants)
      .where(
        and(
          eq(voiceParticipants.voiceChannelId, voiceChannelId),
          eq(voiceParticipants.userId, userId)
        )
      );
    
    // Clean up empty voice channels
    const participants = await this.getVoiceParticipants(voiceChannelId);
    if (participants.length === 0) {
      await this.deleteVoiceChannel(voiceChannelId);
    }
  }

  async getVoiceParticipants(voiceChannelId: string): Promise<VoiceParticipantWithUser[]> {
    const participants = await db
      .select({
        id: voiceParticipants.id,
        voiceChannelId: voiceParticipants.voiceChannelId,
        userId: voiceParticipants.userId,
        isMuted: voiceParticipants.isMuted,
        joinedAt: voiceParticipants.joinedAt,
        gamertag: users.gamertag,
        profileImageUrl: users.profileImageUrl,
      })
      .from(voiceParticipants)
      .leftJoin(users, eq(voiceParticipants.userId, users.id))
      .where(eq(voiceParticipants.voiceChannelId, voiceChannelId));
    
    return participants;
  }

  async updateParticipantMuteStatus(voiceChannelId: string, userId: string, isMuted: boolean): Promise<VoiceParticipant> {
    const [participant] = await db
      .update(voiceParticipants)
      .set({ isMuted })
      .where(
        and(
          eq(voiceParticipants.voiceChannelId, voiceChannelId),
          eq(voiceParticipants.userId, userId)
        )
      )
      .returning();
    
    return participant;
  }

  async getUserActiveVoiceChannel(userId: string): Promise<VoiceChannel | undefined> {
    const [result] = await db
      .select({
        id: voiceChannels.id,
        connectionId: voiceChannels.connectionId,
        hmsRoomId: voiceChannels.hmsRoomId,
        createdAt: voiceChannels.createdAt,
      })
      .from(voiceParticipants)
      .innerJoin(voiceChannels, eq(voiceParticipants.voiceChannelId, voiceChannels.id))
      .where(eq(voiceParticipants.userId, userId))
      .limit(1);
    
    return result || undefined;
  }

  async createGroupVoiceChannel(name: string, creatorId: string, hmsRoomId?: string): Promise<GroupVoiceChannel> {
    const inviteCode = randomUUID().substring(0, 8);
    
    const [channel] = await db
      .insert(groupVoiceChannels)
      .values({ name, creatorId, hmsRoomId, inviteCode, isActive: true })
      .returning();
    
    await this.addGroupVoiceMember(channel.id, creatorId);
    
    return channel;
  }

  async getGroupVoiceChannel(id: string): Promise<GroupVoiceChannel | undefined> {
    const [channel] = await db
      .select()
      .from(groupVoiceChannels)
      .where(eq(groupVoiceChannels.id, id));
    
    return channel || undefined;
  }

  async getGroupVoiceChannelByInvite(inviteCode: string): Promise<GroupVoiceChannel | undefined> {
    const [channel] = await db
      .select()
      .from(groupVoiceChannels)
      .where(eq(groupVoiceChannels.inviteCode, inviteCode));
    
    return channel || undefined;
  }

  async getGroupVoiceChannelByInviteWithDetails(inviteCode: string): Promise<GroupVoiceChannelWithDetails | undefined> {
    const [channel] = await db
      .select({
        id: groupVoiceChannels.id,
        name: groupVoiceChannels.name,
        creatorId: groupVoiceChannels.creatorId,
        hmsRoomId: groupVoiceChannels.hmsRoomId,
        inviteCode: groupVoiceChannels.inviteCode,
        isActive: groupVoiceChannels.isActive,
        createdAt: groupVoiceChannels.createdAt,
        creatorGamertag: users.gamertag,
        creatorProfileImageUrl: users.profileImageUrl,
      })
      .from(groupVoiceChannels)
      .leftJoin(users, eq(groupVoiceChannels.creatorId, users.id))
      .where(eq(groupVoiceChannels.inviteCode, inviteCode));

    if (!channel) return undefined;

    const members = await this.getGroupVoiceMembers(channel.id);
    
    return {
      ...channel,
      memberCount: members.length,
      activeCount: members.filter(m => m.isActive).length,
      members: members,
    };
  }

  async getUserGroupVoiceChannels(userId: string): Promise<GroupVoiceChannelWithDetails[]> {
    const channels = await db
      .select({
        id: groupVoiceChannels.id,
        name: groupVoiceChannels.name,
        creatorId: groupVoiceChannels.creatorId,
        hmsRoomId: groupVoiceChannels.hmsRoomId,
        inviteCode: groupVoiceChannels.inviteCode,
        isActive: groupVoiceChannels.isActive,
        createdAt: groupVoiceChannels.createdAt,
        creatorGamertag: users.gamertag,
        creatorProfileImageUrl: users.profileImageUrl,
      })
      .from(groupVoiceMembers)
      .innerJoin(groupVoiceChannels, eq(groupVoiceMembers.channelId, groupVoiceChannels.id))
      .leftJoin(users, eq(groupVoiceChannels.creatorId, users.id))
      .where(eq(groupVoiceMembers.userId, userId));

    const channelsWithCounts = await Promise.all(
      channels.map(async (channel) => {
        const members = await this.getGroupVoiceMembers(channel.id);
        return {
          ...channel,
          memberCount: members.length,
          activeCount: members.filter(m => m.isActive).length,
          members: members,
        };
      })
    );

    return channelsWithCounts;
  }

  async updateGroupVoiceChannelRoomId(channelId: string, hmsRoomId: string): Promise<GroupVoiceChannel> {
    const [updated] = await db
      .update(groupVoiceChannels)
      .set({ hmsRoomId })
      .where(eq(groupVoiceChannels.id, channelId))
      .returning();
    
    return updated;
  }

  async deleteGroupVoiceChannel(channelId: string, userId: string): Promise<void> {
    const channel = await this.getGroupVoiceChannel(channelId);
    
    if (!channel || channel.creatorId !== userId) {
      throw new Error('Unauthorized or channel not found');
    }
    
    await db.delete(groupVoiceChannels).where(eq(groupVoiceChannels.id, channelId));
  }

  async addGroupVoiceMember(channelId: string, userId: string): Promise<GroupVoiceMember> {
    const [existing] = await db
      .select()
      .from(groupVoiceMembers)
      .where(
        and(
          eq(groupVoiceMembers.channelId, channelId),
          eq(groupVoiceMembers.userId, userId)
        )
      );
    
    if (existing) return existing;
    
    const [member] = await db
      .insert(groupVoiceMembers)
      .values({ channelId, userId, isActive: false, isMuted: false })
      .returning();
    
    return member;
  }

  async removeGroupVoiceMember(channelId: string, userId: string): Promise<void> {
    await db
      .delete(groupVoiceMembers)
      .where(
        and(
          eq(groupVoiceMembers.channelId, channelId),
          eq(groupVoiceMembers.userId, userId)
        )
      );
  }

  async getGroupVoiceMembers(channelId: string): Promise<GroupVoiceMemberWithUser[]> {
    const members = await db
      .select({
        id: groupVoiceMembers.id,
        channelId: groupVoiceMembers.channelId,
        userId: groupVoiceMembers.userId,
        isActive: groupVoiceMembers.isActive,
        isMuted: groupVoiceMembers.isMuted,
        joinedAt: groupVoiceMembers.joinedAt,
        gamertag: users.gamertag,
        profileImageUrl: users.profileImageUrl,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(groupVoiceMembers)
      .leftJoin(users, eq(groupVoiceMembers.userId, users.id))
      .where(eq(groupVoiceMembers.channelId, channelId));
    
    return members;
  }

  async setGroupMemberActive(channelId: string, userId: string, isActive: boolean): Promise<GroupVoiceMember> {
    const [updated] = await db
      .update(groupVoiceMembers)
      .set({ isActive })
      .where(
        and(
          eq(groupVoiceMembers.channelId, channelId),
          eq(groupVoiceMembers.userId, userId)
        )
      )
      .returning();
    
    return updated;
  }

  async setGroupMemberMuted(channelId: string, userId: string, isMuted: boolean): Promise<GroupVoiceMember> {
    const [updated] = await db
      .update(groupVoiceMembers)
      .set({ isMuted })
      .where(
        and(
          eq(groupVoiceMembers.channelId, channelId),
          eq(groupVoiceMembers.userId, userId)
        )
      )
      .returning();
    
    return updated;
  }

  async cleanupUserActiveStatus(userId: string): Promise<void> {
    await db
      .update(groupVoiceMembers)
      .set({ isActive: false })
      .where(eq(groupVoiceMembers.userId, userId));
  }

  // Group voice channel invite operations
  async createGroupVoiceInvite(channelId: string, inviterId: string, inviteeId: string): Promise<GroupVoiceInvite> {
    const [invite] = await db
      .insert(groupVoiceInvites)
      .values({ channelId, inviterId, inviteeId, status: 'pending' })
      .returning();
    
    return invite;
  }

  async getPendingGroupVoiceInvites(userId: string): Promise<GroupVoiceInviteWithUser[]> {
    const invites = await db
      .select({
        id: groupVoiceInvites.id,
        channelId: groupVoiceInvites.channelId,
        inviterId: groupVoiceInvites.inviterId,
        inviteeId: groupVoiceInvites.inviteeId,
        status: groupVoiceInvites.status,
        createdAt: groupVoiceInvites.createdAt,
        respondedAt: groupVoiceInvites.respondedAt,
        inviterGamertag: users.gamertag,
        inviterProfileImageUrl: users.profileImageUrl,
        inviteeGamertag: sql<string | null>`NULL`,
        inviteeProfileImageUrl: sql<string | null>`NULL`,
        channelName: groupVoiceChannels.name,
      })
      .from(groupVoiceInvites)
      .leftJoin(users, eq(groupVoiceInvites.inviterId, users.id))
      .leftJoin(groupVoiceChannels, eq(groupVoiceInvites.channelId, groupVoiceChannels.id))
      .where(
        and(
          eq(groupVoiceInvites.inviteeId, userId),
          eq(groupVoiceInvites.status, 'pending')
        )
      );
    
    return invites;
  }

  async getSentGroupVoiceInvites(userId: string): Promise<GroupVoiceInviteWithUser[]> {
    const invites = await db
      .select({
        id: groupVoiceInvites.id,
        channelId: groupVoiceInvites.channelId,
        inviterId: groupVoiceInvites.inviterId,
        inviteeId: groupVoiceInvites.inviteeId,
        status: groupVoiceInvites.status,
        createdAt: groupVoiceInvites.createdAt,
        respondedAt: groupVoiceInvites.respondedAt,
        inviterGamertag: sql<string | null>`NULL`,
        inviterProfileImageUrl: sql<string | null>`NULL`,
        inviteeGamertag: users.gamertag,
        inviteeProfileImageUrl: users.profileImageUrl,
        channelName: groupVoiceChannels.name,
      })
      .from(groupVoiceInvites)
      .leftJoin(users, eq(groupVoiceInvites.inviteeId, users.id))
      .leftJoin(groupVoiceChannels, eq(groupVoiceInvites.channelId, groupVoiceChannels.id))
      .where(
        and(
          eq(groupVoiceInvites.inviterId, userId),
          eq(groupVoiceInvites.status, 'pending')
        )
      );
    
    return invites;
  }

  async getGroupVoiceInvite(inviteId: string): Promise<GroupVoiceInvite | undefined> {
    const [invite] = await db
      .select()
      .from(groupVoiceInvites)
      .where(eq(groupVoiceInvites.id, inviteId));
    
    return invite || undefined;
  }

  async hasExistingPendingInvite(channelId: string, inviteeId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(groupVoiceInvites)
      .where(
        and(
          eq(groupVoiceInvites.channelId, channelId),
          eq(groupVoiceInvites.inviteeId, inviteeId),
          eq(groupVoiceInvites.status, 'pending')
        )
      )
      .limit(1);
    
    return !!existing;
  }

  async acceptGroupVoiceInvite(inviteId: string): Promise<void> {
    const invite = await this.getGroupVoiceInvite(inviteId);
    
    if (!invite) {
      throw new Error('Invite not found');
    }
    
    if (invite.status !== 'pending') {
      throw new Error('Invite already responded to');
    }
    
    // Add user to channel members
    await this.addGroupVoiceMember(invite.channelId, invite.inviteeId);
    
    // Update invite status
    await db
      .update(groupVoiceInvites)
      .set({ status: 'accepted', respondedAt: sql`NOW()` })
      .where(eq(groupVoiceInvites.id, inviteId));
  }

  async declineGroupVoiceInvite(inviteId: string): Promise<void> {
    const invite = await this.getGroupVoiceInvite(inviteId);
    
    if (!invite) {
      throw new Error('Invite not found');
    }
    
    if (invite.status !== 'pending') {
      throw new Error('Invite already responded to');
    }
    
    // Update invite status
    await db
      .update(groupVoiceInvites)
      .set({ status: 'declined', respondedAt: sql`NOW()` })
      .where(eq(groupVoiceInvites.id, inviteId));
  }
}

export const storage = new DatabaseStorage();

// Note: Seed data removed - users will sign in with Google OAuth
// Real match requests will be created by authenticated users