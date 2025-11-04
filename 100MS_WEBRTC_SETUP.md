# 100ms WebRTC Integration Guide for GameMatch

## Overview
100ms provides a powerful WebRTC infrastructure for real-time voice and video communication, perfect for GameMatch's voice channel feature.

## Why 100ms?

### Cost Benefits
- **FREE tier**: 10,000 minutes/month (833 hours!)
- **Pay-as-you-go**: $0.0099/min after free tier (~$0.60/hour)
- **No setup fees** or monthly minimums
- **Better value** than self-hosted WebRTC (40-60% reliability)

### Perfect for GameMatch
- Voice channels between matched players
- Future video chat support
- Screen sharing for game coaching
- Recording support for highlights
- Built-in noise cancellation
- Low latency (~150ms globally)

## Setup Instructions

### 1. Create 100ms Account
1. Go to [100ms Dashboard](https://dashboard.100ms.live/)
2. Sign up for free account
3. Create a new app: "GameMatch Voice"

### 2. Get App Credentials
From the dashboard, copy these values:
- **Access Key** (also called App ID)
- **App Secret**
- **Template ID** (for voice-only rooms)

### 3. Add Secrets to Replit
```bash
HMS_APP_ACCESS_KEY=your_access_key
HMS_APP_SECRET=your_app_secret
HMS_TEMPLATE_ID=your_template_id
```

### 4. Install 100ms SDK
```bash
npm install @100mslive/server-sdk @100mslive/react-sdk
```

### 5. Backend: Generate Auth Tokens (server/hms.ts)
```typescript
import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';

export function generateHMSToken(userId: string, roomId: string, role: string = 'guest'): string {
  const payload = {
    access_key: process.env.HMS_APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, process.env.HMS_APP_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: uuid(),
  });
}

export async function createHMSRoom(connectionId: string): Promise<string> {
  const response = await fetch('https://api.100ms.live/v2/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HMS_APP_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `voice-${connectionId}`,
      description: 'GameMatch voice channel',
      template_id: process.env.HMS_TEMPLATE_ID,
    }),
  });

  const data = await response.json();
  return data.id;
}
```

### 6. Backend: Voice Channel Routes
```typescript
// Create voice channel for a connection
app.post("/api/voice/join/:connectionId", async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user!.id;

  // Check if voice channel exists
  let [channel] = await db
    .select()
    .from(voiceChannels)
    .where(eq(voiceChannels.connectionId, connectionId))
    .limit(1);

  // Create if doesn't exist
  if (!channel) {
    const roomId = await createHMSRoom(connectionId);
    [channel] = await db
      .insert(voiceChannels)
      .values({ connectionId, roomId })
      .returning();
  }

  // Generate auth token
  const token = generateHMSToken(userId, channel.roomId!);

  // Add participant
  await db.insert(voiceParticipants).values({
    voiceChannelId: channel.id,
    userId,
    isMuted: false,
  });

  res.json({ token, roomId: channel.roomId });
});

// Leave voice channel
app.post("/api/voice/leave/:connectionId", async (req, res) => {
  const { connectionId } = req.params;
  const userId = req.user!.id;

  const [channel] = await db
    .select()
    .from(voiceChannels)
    .where(eq(voiceChannels.connectionId, connectionId))
    .limit(1);

  if (channel) {
    await db
      .delete(voiceParticipants)
      .where(
        and(
          eq(voiceParticipants.voiceChannelId, channel.id),
          eq(voiceParticipants.userId, userId)
        )
      );
  }

  res.json({ success: true });
});
```

### 7. Frontend: Voice Channel Component
```typescript
import { useHMSActions, useHMSStore, selectIsConnectedToRoom, selectPeers } from '@100mslive/react-sdk';

export function VoiceChannel({ connectionId }: { connectionId: string }) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);

  const joinVoice = async () => {
    const res = await fetch(`/api/voice/join/${connectionId}`, { method: 'POST' });
    const { token, roomId } = await res.json();

    await hmsActions.join({
      userName: user.gamertag,
      authToken: token,
      settings: {
        isAudioMuted: false,
        isVideoMuted: true, // Voice only
      },
    });
  };

  const leaveVoice = async () => {
    await hmsActions.leave();
    await fetch(`/api/voice/leave/${connectionId}`, { method: 'POST' });
  };

  const toggleMute = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  return (
    <div className="voice-channel">
      <h3>Voice Channel</h3>
      {!isConnected ? (
        <Button onClick={joinVoice} data-testid="button-join-voice">
          Join Voice Channel
        </Button>
      ) : (
        <>
          <div className="participants">
            {peers.map(peer => (
              <div key={peer.id} className="peer">
                <Avatar src={peer.avatarUrl} />
                <span>{peer.name}</span>
                {peer.audioTrack?.enabled ? <Mic /> : <MicOff />}
              </div>
            ))}
          </div>
          <Button onClick={toggleMute} data-testid="button-toggle-mute">
            {isLocalAudioEnabled ? <Mic /> : <MicOff />}
          </Button>
          <Button onClick={leaveVoice} variant="destructive" data-testid="button-leave-voice">
            Leave
          </Button>
        </>
      )}
    </div>
  );
}
```

### 8. Update Schema (Already Done! ✅)
Your schema already has voice channels and participants:
- `voiceChannels` table
- `voiceParticipants` table

## Features to Implement

### Phase 1: Basic Voice
- [x] Voice channel schema
- [ ] Join/leave voice channel
- [ ] Mute/unmute
- [ ] Show active participants
- [ ] Auto-disconnect on page close

### Phase 2: Enhanced Features
- [ ] Push-to-talk option
- [ ] Volume controls per user
- [ ] Noise cancellation toggle
- [ ] Echo cancellation
- [ ] Voice activity detection

### Phase 3: Advanced Features
- [ ] Record voice sessions
- [ ] Screen sharing for coaching
- [ ] Video toggle option
- [ ] Multiple voice channels per server
- [ ] Voice channel invites

## Cost Estimation for GameMatch

Assuming 1,000 active users:
- **Average session**: 30 minutes
- **Active voice users**: 20% = 200 users
- **Sessions per month**: 200 × 10 = 2,000 sessions
- **Total minutes**: 2,000 × 30 = **60,000 minutes**

**Monthly Cost**:
- First 10,000 minutes: FREE
- Remaining 50,000 minutes: 50,000 × $0.0099 = **$495/month**

### Optimization Strategies
1. **Peer-to-peer for 1v1**: Use WebRTC directly for 2-person calls (FREE!)
2. **Encourage shorter sessions**: Most gaming sessions are 15-30 min
3. **Voice-only rooms**: Cheaper than video
4. **Regional servers**: Reduce bandwidth costs

With P2P for 1v1 calls:
- **Group calls** (3+ people): 30% of total = 18,000 minutes
- **Cost**: 8,000 × $0.0099 = **$79/month** 💰

## Alternative: Self-Hosted WebRTC
- **Pros**: No per-minute costs
- **Cons**: 
  - Server costs: $50-200/month
  - 40-60% connection reliability
  - Complex TURN/STUN setup
  - NAT traversal issues
  - No built-in features

**Verdict**: 100ms is better for reliability and developer experience! 🎉

## Integration Checklist

- [ ] Create 100ms account
- [ ] Get app credentials
- [ ] Add secrets to Replit
- [ ] Install 100ms SDKs
- [ ] Create HMS helper functions
- [ ] Add voice join/leave routes
- [ ] Build VoiceChannel component
- [ ] Test voice connections
- [ ] Add mute/unmute controls
- [ ] Show active participants
- [ ] Handle disconnections
- [ ] Add voice indicators in chat

## Resources

- [100ms Docs](https://www.100ms.live/docs)
- [100ms React SDK](https://www.100ms.live/docs/javascript/v2/get-started/react-quickstart)
- [100ms Pricing](https://www.100ms.live/pricing)
- [WebRTC Best Practices](https://webrtc.org/getting-started/overview)
