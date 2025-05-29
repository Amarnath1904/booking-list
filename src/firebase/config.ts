import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

// web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Log Firebase config for debugging (remove in production)
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Config:', {
    apiKeyExists: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomainExists: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectIdExists: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // Don't log actual values for security reasons
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to LOCAL for better user experience
// This ensures the user remains logged in even after browser refresh
if (typeof window !== 'undefined') {
  import('firebase/auth').then((firebaseAuth) => {
    if (firebaseAuth.setPersistence && firebaseAuth.browserLocalPersistence) {
      firebaseAuth.setPersistence(auth, firebaseAuth.browserLocalPersistence)
        .catch((error: Error) => { // Changed any to Error
          console.error('Auth persistence error:', error);
        });
    }
  });
}

// Analytics might not be available in all environments 
let analytics: Analytics | undefined = undefined;
if (typeof window !== 'undefined') {
  try {
    // We only initialize analytics on the client side
    analytics = getAnalytics(app);
  } catch (error) {
    console.error('Analytics failed to initialize:', error);
  }
}

export { app, auth, analytics };
