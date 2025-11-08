import { db } from "./db";
import { users, matchRequests, gameProfiles, hobbies, connectionRequests, matchConnections, chatMessages, voiceChannels, groupVoiceChannels, groupVoiceMembers } from "@shared/schema";

const locations = [
  { city: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { city: "New York, NY", lat: 40.7128, lng: -74.0060 },
  { city: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { city: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { city: "Phoenix, AZ", lat: 33.4484, lng: -112.0740 },
  { city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { city: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { city: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { city: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { city: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { city: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { city: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { city: "Atlanta, GA", lat: 33.7490, lng: -84.3880 },
];

const games = ["Valorant", "League of Legends", "CS:GO", "Apex Legends", "Overwatch 2", "Fortnite", "Rocket League", "Dota 2"];

const bios = [
  "Competitive gamer looking for serious teammates. Let's climb the ranks together! 🎮",
  "Casual player who loves strategy games. Always down for a good match!",
  "Pro-level skills in FPS games. Looking for tournament-ready players.",
  "Just here to have fun and make new gaming friends. No toxicity please! ✌️",
  "Streamer and content creator. Let's create some epic moments!",
  "Night owl gamer - usually online after 10pm EST. Let's squad up!",
  "Former semi-pro player getting back into competitive gaming.",
  "Friendly player who enjoys coaching newcomers. Happy to help!",
  "Looking for long-term duo/team. Communication is key! 🎤",
  "Hardcore grinder who plays daily. Let's dominate the leaderboards!",
  "Variety gamer who enjoys trying new games. Always up for suggestions!",
  "Competitive but chill. Here to win but also have a good time.",
  "Team player with great game sense. Positive vibes only! 🌟",
];

const dummyUsers = [
  { gamertag: "ShadowStrike99", firstName: "Alex", lastName: "Johnson", age: 24, gender: "male" as const, language: "English" },
  { gamertag: "LunaGaming", firstName: "Sarah", lastName: "Martinez", age: 22, gender: "female" as const, language: "English" },
  { gamertag: "PhoenixRising", firstName: "Michael", lastName: "Chen", age: 27, gender: "male" as const, language: "English" },
  { gamertag: "NovaBlast", firstName: "Emily", lastName: "Rodriguez", age: 21, gender: "female" as const, language: "Spanish" },
  { gamertag: "CyberNinja", firstName: "James", lastName: "Taylor", age: 25, gender: "male" as const, language: "English" },
  { gamertag: "StarGazer42", firstName: "Jessica", lastName: "Lee", age: 23, gender: "female" as const, language: "English" },
  { gamertag: "ThunderBolt", firstName: "David", lastName: "Williams", age: 28, gender: "male" as const, language: "English" },
  { gamertag: "MysticRose", firstName: "Amanda", lastName: "Brown", age: 20, gender: "female" as const, language: "English" },
  { gamertag: "IronFist", firstName: "Chris", lastName: "Davis", age: 26, gender: "male" as const, language: "English" },
  { gamertag: "CrystalMaiden", firstName: "Rachel", lastName: "Wilson", age: 24, gender: "female" as const, language: "English" },
  { gamertag: "BlazeFury", firstName: "Ryan", lastName: "Garcia", age: 29, gender: "male" as const, language: "English" },
  { gamertag: "StormBreaker", firstName: "Kevin", lastName: "Moore", age: 22, gender: "male" as const, language: "English" },
  { gamertag: "EchoWarrior", firstName: "Nicole", lastName: "Anderson", age: 25, gender: "female" as const, language: "English" },
];

export async function seedDummyUsers() {
  console.log("🌱 Starting to seed dummy users...");

  try {
    const createdUsers: any[] = [];
    const createdMatchRequests: any[] = [];

    // Create users with their profiles, hobbies, and match requests
    for (let i = 0; i < dummyUsers.length; i++) {
      const userData = dummyUsers[i];
      const location = locations[i];
      const userGames = [
        games[Math.floor(Math.random() * games.length)],
        games[Math.floor(Math.random() * games.length)],
        games[Math.floor(Math.random() * games.length)],
      ].filter((game, index, self) => self.indexOf(game) === index);

      const [user] = await db.insert(users).values({
        gamertag: userData.gamertag,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: `${userData.gamertag.toLowerCase()}@example.com`,
        age: userData.age,
        gender: userData.gender,
        language: userData.language,
        bio: bios[i % bios.length],
        location: location.city,
        latitude: location.lat,
        longitude: location.lng,
        preferredGames: userGames,
        profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.gamertag}`,
      }).returning();

      createdUsers.push(user);
      console.log(`✅ Created user: ${user.gamertag}`);

      if (Math.random() > 0.4) {
        const game = userGames[0];
        await db.insert(gameProfiles).values({
          userId: user.id,
          gameName: game,
          currentRank: ["Bronze", "Silver", "Gold", "Platinum", "Diamond"][Math.floor(Math.random() * 5)],
          highestRank: ["Gold", "Platinum", "Diamond", "Master", "Grandmaster"][Math.floor(Math.random() * 5)],
          hoursPlayed: Math.floor(Math.random() * 1000) + 100,
          achievements: ["Team Player", "MVP", "Ace", "Clutch Master"].slice(0, Math.floor(Math.random() * 3) + 1),
        });
        console.log(`  📊 Added game profile for ${game}`);
      }

      if (Math.random() > 0.5) {
        const categories = ["anime", "music", "art", "fitness", "cooking"];
        const category = categories[Math.floor(Math.random() * categories.length)];
        await db.insert(hobbies).values({
          userId: user.id,
          category,
          title: `Love ${category}!`,
          description: `I'm really into ${category} and enjoy it in my free time.`,
        });
        console.log(`  🎨 Added hobby: ${category}`);
      }

      if (Math.random() > 0.3) {
        const matchGame = userGames[Math.floor(Math.random() * userGames.length)];
        const [matchRequest] = await db.insert(matchRequests).values({
          userId: user.id,
          gameName: matchGame,
          gameMode: ["1v1", "2v2", "5v5", "Squad"][Math.floor(Math.random() * 4)],
          matchType: Math.random() > 0.5 ? "lfg" : "lfo",
          duration: Math.random() > 0.5 ? "short-term" : "long-term",
          description: `Looking for skilled ${matchGame} players. ${Math.random() > 0.5 ? "Let's rank up!" : "Casual fun games!"}`,
          region: location.city.split(",")[1]?.trim() || "NA",
        }).returning();
        createdMatchRequests.push(matchRequest);
        console.log(`  🎮 Created match request for ${matchGame}`);
      }
    }

    // Create connection requests between users (direct user-to-user connections)
    console.log("\n🤝 Creating connection requests...");
    let connectionRequestCount = 0;
    for (let i = 0; i < Math.min(8, createdUsers.length - 1); i++) {
      const sender = createdUsers[i];
      const receiver = createdUsers[i + 1];
      
      // Create various statuses for testing
      const statuses = ["pending", "pending", "accepted", "declined"];
      const status = statuses[connectionRequestCount % statuses.length];
      
      await db.insert(connectionRequests).values({
        senderId: sender.id,
        receiverId: receiver.id,
        status,
      });
      
      console.log(`  ✉️  Connection request: ${sender.gamertag} → ${receiver.gamertag} (${status})`);
      connectionRequestCount++;
    }

    // Create match applications (match connections)
    console.log("\n📋 Creating match applications...");
    let applicationCount = 0;
    for (let i = 0; i < Math.min(10, createdMatchRequests.length); i++) {
      const matchRequest = createdMatchRequests[i];
      // Find a different user to apply to this match request
      const applicant = createdUsers.find(u => u.id !== matchRequest.userId);
      
      if (applicant) {
        // Create various statuses for testing
        const statuses = ["pending", "pending", "pending", "accepted", "declined"];
        const status = statuses[applicationCount % statuses.length];
        
        await db.insert(matchConnections).values({
          requestId: matchRequest.id,
          requesterId: applicant.id,  // Person applying
          accepterId: matchRequest.userId,  // Match request owner
          status,
        });
        
        console.log(`  📝 Application: ${applicant.gamertag} → ${createdUsers.find(u => u.id === matchRequest.userId)?.gamertag}'s match (${status})`);
        applicationCount++;
      }
    }

    // Create chat messages for accepted connections
    console.log("\n💬 Creating chat messages...");
    let messageCount = 0;
    const acceptedConnectionRequests = await db.query.connectionRequests.findMany({
      where: (cr, { eq }) => eq(cr.status, 'accepted')
    });

    for (const conn of acceptedConnectionRequests) {
      const messages = [
        "Hey! Looking forward to playing together!",
        "What's your rank in Valorant?",
        "I'm usually online after 8pm EST",
        "Let's queue up sometime this week!",
        "Down for some ranked matches?",
        "Your profile looks awesome!",
      ];

      for (let i = 0; i < 3; i++) {
        const isSenderFirst = i % 2 === 0;
        await db.insert(chatMessages).values({
          connectionId: conn.id,
          senderId: isSenderFirst ? conn.senderId : conn.receiverId,
          receiverId: isSenderFirst ? conn.receiverId : conn.senderId,
          message: messages[Math.floor(Math.random() * messages.length)],
        });
        messageCount++;
      }
      console.log(`  💬 Added messages for connection ${conn.id.substring(0, 8)}...`);
    }

    // Create voice channels for some accepted connections
    console.log("\n🎤 Creating voice channels...");
    let voiceChannelCount = 0;
    const connectionsForVoice = acceptedConnectionRequests.slice(0, 3);

    for (const conn of connectionsForVoice) {
      await db.insert(voiceChannels).values({
        connectionId: conn.id,
        hmsRoomId: `room-${conn.id}`,
      });
      voiceChannelCount++;
      console.log(`  🎤 Voice channel for connection ${conn.id.substring(0, 8)}...`);
    }

    // Create group voice channels
    console.log("\n👥 Creating group voice channels...");
    let groupChannelCount = 0;
    
    if (createdUsers.length >= 4) {
      const [groupChannel1] = await db.insert(groupVoiceChannels).values({
        name: "Squad Gaming Session",
        creatorId: createdUsers[0].id,
        hmsRoomId: `group-room-1`,
        inviteCode: `squad-${Math.random().toString(36).substring(7)}`,
        isActive: true,
      }).returning();

      await db.insert(groupVoiceMembers).values([
        { channelId: groupChannel1.id, userId: createdUsers[0].id, isActive: true, isMuted: false },
        { channelId: groupChannel1.id, userId: createdUsers[1].id, isActive: true, isMuted: false },
        { channelId: groupChannel1.id, userId: createdUsers[2].id, isActive: false, isMuted: false },
      ]);
      groupChannelCount++;
      console.log(`  👥 Group channel: ${groupChannel1.name} (3 members)`);

      const [groupChannel2] = await db.insert(groupVoiceChannels).values({
        name: "Competitive Team",
        creatorId: createdUsers[3].id,
        hmsRoomId: `group-room-2`,
        inviteCode: `team-${Math.random().toString(36).substring(7)}`,
        isActive: true,
      }).returning();

      await db.insert(groupVoiceMembers).values([
        { channelId: groupChannel2.id, userId: createdUsers[3].id, isActive: true, isMuted: false },
        { channelId: groupChannel2.id, userId: createdUsers[4].id, isActive: true, isMuted: true },
        { channelId: groupChannel2.id, userId: createdUsers[5].id, isActive: false, isMuted: false },
        { channelId: groupChannel2.id, userId: createdUsers[6].id, isActive: false, isMuted: false },
      ]);
      groupChannelCount++;
      console.log(`  👥 Group channel: ${groupChannel2.name} (4 members)`);
    }

    console.log("\n✨ Successfully seeded comprehensive dummy data!");
    console.log(`   👥 ${createdUsers.length} users`);
    console.log(`   🎮 ${createdMatchRequests.length} match requests`);
    console.log(`   🤝 ${connectionRequestCount} connection requests`);
    console.log(`   📋 ${applicationCount} match applications`);
    console.log(`   💬 ${messageCount} chat messages`);
    console.log(`   🎤 ${voiceChannelCount} voice channels`);
    console.log(`   👥 ${groupChannelCount} group voice channels`);
    console.log("\n📝 Check the Messages and Voice Channels to test!");
  } catch (error) {
    console.error("❌ Error seeding dummy users:", error);
    throw error;
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedDummyUsers()
    .then(() => {
      console.log("✅ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
