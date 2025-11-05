import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys for web push notifications
// In production, these should be environment variables
// Generate with: npx web-push generate-vapid-keys
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@gamematch.app';

// Generate VAPID keys if not set
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log('\n⚠️  VAPID keys not configured. Using temporary keys for this session.');
  console.log('📧 To persist keys, add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT to your environment secrets.\n');
  
  // Use generated keys for this session
  VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Export public key for use in routes
export const vapidPublicKey = VAPID_PUBLIC_KEY;

export interface PushNotificationPayload {
  title: string;
  message: string;
  type?: string;
  relatedUserId?: string;
  relatedMatchId?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    // Get user's push subscriptions
    const subscriptions = await storage.getUserPushSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send push notification to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        console.log(`Push notification sent to ${userId}`);
      } catch (error: any) {
        console.error(`Failed to send push notification:`, error);
        
        // If subscription is invalid/expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing expired subscription for ${userId}`);
          await storage.deletePushSubscription(subscription.endpoint, userId);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
    throw error;
  }
}

export async function sendPushToMultipleUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<void> {
  const promises = userIds.map(userId => sendPushNotification(userId, payload));
  await Promise.allSettled(promises);
}
