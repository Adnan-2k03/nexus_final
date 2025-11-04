import { SDK } from '@100mslive/server-sdk';

const HMS_APP_ID = process.env.HMS_APP_ID;
const HMS_APP_SECRET = process.env.HMS_APP_SECRET;
const HMS_TEMPLATE_ID = process.env.HMS_TEMPLATE_ID;

let hmsClient: SDK | null = null;

if (HMS_APP_ID && HMS_APP_SECRET) {
  hmsClient = new SDK(HMS_APP_ID, HMS_APP_SECRET);
}

export interface CreateRoomOptions {
  name: string;
  description?: string;
  templateId?: string;
}

export interface GenerateTokenOptions {
  roomId: string;
  userId: string;
  role: 'guest' | 'host';
}

export interface HMSService {
  createRoom: (options: CreateRoomOptions) => Promise<any>;
  generateAuthToken: (options: GenerateTokenOptions) => Promise<string>;
  endRoom: (roomId: string) => Promise<void>;
  isConfigured: () => boolean;
}

export const hmsService: HMSService = {
  isConfigured: () => {
    return !!(HMS_APP_ID && HMS_APP_SECRET);
  },

  createRoom: async ({ name, description, templateId }: CreateRoomOptions) => {
    if (!hmsClient) {
      throw new Error('100ms is not configured. Please set HMS environment variables.');
    }

    const room = await hmsClient.rooms.create({
      name,
      description: description || `Voice chat for ${name}`,
      template_id: templateId || HMS_TEMPLATE_ID,
    });

    return room;
  },

  generateAuthToken: async ({ roomId, userId, role }: GenerateTokenOptions): Promise<string> => {
    if (!hmsClient) {
      throw new Error('100ms is not configured. Please set HMS environment variables.');
    }

    const tokenObj = await hmsClient.auth.getAuthToken({
      roomId,
      userId,
      role,
    });

    return typeof tokenObj === 'string' ? tokenObj : (tokenObj as any).token;
  },

  endRoom: async (roomId: string) => {
    if (!hmsClient) {
      throw new Error('100ms is not configured. Please set HMS environment variables.');
    }

    try {
      await (hmsClient as any).activeRooms.endRoom(roomId, {
        reason: 'Voice channel ended',
        lock: false
      });
    } catch (error) {
      console.error('Error ending room:', error);
    }
  },
};

export function generateRoomName(connectionId: string): string {
  return `room-${connectionId}`;
}
