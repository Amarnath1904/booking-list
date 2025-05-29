// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/config';
import { UserRole } from '@/constants/userRoles';
import { setCookie, deleteCookie } from '@/app/utils/cookies';

interface AuthContextType {
  user: FirebaseUser | null;
  userRole: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true); // Initial state is true
  const router = useRouter();

  useEffect(() => {
    console.log("AuthContext: useEffect for onAuthStateChanged mounted.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged callback triggered. Firebase user UID:", firebaseUser?.uid || 'null');
      setUser(firebaseUser); 

      try {
        if (firebaseUser) {
          console.log(`AuthContext: Firebase user found (UID: ${firebaseUser.uid}). Fetching user role.`);
          const response = await fetch(`/api/users/${firebaseUser.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
            console.log(`AuthContext: Role fetched: ${userData.role} for user ${firebaseUser.uid}.`);
            
            setCookie('firebaseUid', firebaseUser.uid, 7);
            setCookie('session', 'true', 7);
            setCookie('role', userData.role, 7);
            console.log('AuthContext: Cookies set for user', firebaseUser.uid);
          } else {
            console.error(`AuthContext: Failed to fetch user role for ${firebaseUser.uid}, status: ${response.status}. Response text: ${await response.text()}`);
            setUserRole(null); 
          }
        } else {
          console.log('AuthContext: No Firebase user. Clearing role and cookies.');
          setUserRole(null);
          deleteCookie('firebaseUid');
          deleteCookie('session');
          deleteCookie('role');
          console.log('AuthContext: User signed out, cookies cleared');
        }
      } catch (error: unknown) {
        console.error('AuthContext: Error during auth state processing (fetching role or setting cookies):', error);
        setUserRole(null); 
      } finally {
        console.log(`AuthContext: Reached finally block for user ${firebaseUser?.uid || 'null'}. Calling setLoading(false).`);
        setLoading(false);
        console.log(`AuthContext: setLoading(false) called. Current loading state should be false.`);
      }
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clear cookies
      deleteCookie('firebaseUid');
      deleteCookie('session');
      deleteCookie('role');
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
