import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

/**
 * Sign in with Google using Firebase Authentication for mobile
 * This handles the native Google account picker and keeps the user in the app
 */
export async function signInWithGoogleMobile() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('This function is for mobile platforms only. Use web OAuth for browsers.');
  }

  try {
    // Sign in with Firebase Authentication plugin
    // This will show the native Google account picker
    const result = await FirebaseAuthentication.signInWithGoogle({
      mode: 'redirect',
    });

    if (!result.credential?.idToken) {
      throw new Error('No ID token received from Google sign-in');
    }

    // Create Firebase credential
    const credential = GoogleAuthProvider.credential(result.credential.idToken);

    // Sign in to Firebase Auth
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, credential);

    // Get ID token to sync with backend
    const idToken = await userCredential.user.getIdToken();
    
    // Call your backend to create session
    const response = await fetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to sync authentication with backend');
    }

    return userCredential.user;
  } catch (error) {
    console.error('Mobile Google sign-in error:', error);
    throw error;
  }
}

/**
 * Sign out from Firebase Authentication
 */
export async function signOutMobile() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await FirebaseAuthentication.signOut();
    
    // Also sign out from backend
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Mobile sign-out error:', error);
    throw error;
  }
}

/**
 * Get the current Firebase user
 */
export async function getCurrentUserMobile() {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const result = await FirebaseAuthentication.getCurrentUser();
    return result.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated on mobile
 */
export async function isAuthenticatedMobile(): Promise<boolean> {
  const user = await getCurrentUserMobile();
  return user !== null;
}
