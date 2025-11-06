import admin from 'firebase-admin';

const isConfigured = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL
);

if (!isConfigured) {
  console.warn("⚠️  Firebase not configured - phone verification will not be available");
  console.warn("   Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL to enable");
}

if (isConfigured) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      }),
    });
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
  }
}

export async function verifyFirebaseToken(idToken: string) {
  if (!isConfigured) {
    console.error("Firebase is not configured. Cannot verify token.");
    return null;
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}

export async function createOrGetUserByPhone(phoneNumber: string) {
  if (!isConfigured) {
    return null;
  }

  try {
    const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({
        phoneNumber: phoneNumber,
      });
      return newUser;
    }
    throw error;
  }
}

export function isPhoneAuthConfigured(): boolean {
  return isConfigured;
}
