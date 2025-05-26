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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user role from the API
          const response = await fetch(`/api/users/${firebaseUser.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
            
            // Set cookies with path and expiration
            setCookie('firebaseUid', firebaseUser.uid, 7); // 7 days
            setCookie('session', 'true', 7); // 7 days
            setCookie('role', userData.role, 7); // 7 days
            
            console.log('Auth context: Cookies set for user', firebaseUser.uid);
          } else {
            console.error('Failed to fetch user role');
          }
        } catch (error: unknown) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setUserRole(null);
        
        // Clear cookies if user is signed out
        deleteCookie('firebaseUid');
        deleteCookie('session');
        deleteCookie('role');
        
        console.log('Auth context: User signed out, cookies cleared');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);  const signOut = async () => {    try {
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
