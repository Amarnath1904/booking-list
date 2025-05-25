// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDasga52pWXpQcTIzzJAfV-e-KeX01598k",
  authDomain: "booking-list-47c22.firebaseapp.com",
  projectId: "booking-list-47c22",
  storageBucket: "booking-list-47c22.firebasestorage.app",
  messagingSenderId: "845543265903",
  appId: "1:845543265903:web:fa05fa2ac8f266362cdf9a",
  measurementId: "G-KLQ1KV7R47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Analytics might not be available in all environments
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, analytics };
