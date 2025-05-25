'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/firebase/config';

enum UserRole {
  AGENT = 'agent',
  HOST = 'host',
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      
      if (currentUser) {
        setUser(currentUser);
        
        try {
          // Check if user exists in our database and redirect accordingly
          const response = await fetch(`/api/users/${currentUser.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            // Redirect based on role
            if (userData.role === UserRole.AGENT) {
              router.push('/agent-dashboard');
              return;
            } else if (userData.role === UserRole.HOST) {
              router.push('/host-dashboard');
              return;
            }
            // If we reach here, user has an unknown role, keep them on generic dashboard
          } else if (response.status === 404) {
            // User doesn't exist in our database yet
            // We could prompt them to select a role here
          }
        } catch (error) {
          console.error('Error checking user:', error);
        }
      } else {
        router.push('/login');
        return;
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <header className="px-6 sm:px-12 py-4 flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Booking-List</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-700 dark:text-slate-300">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
            Welcome to Your Dashboard
          </h2>
          
          <div className="mb-6 p-4 bg-blue-50 dark:bg-slate-700 rounded-lg">
            <p className="text-slate-700 dark:text-slate-300">
              You are logged in as: <span className="font-medium">{user?.email}</span>
            </p>
          </div>
          
          <div className="mb-8 p-4 bg-yellow-50 dark:bg-amber-900/30 border border-yellow-200 dark:border-amber-800 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Please Select Your Role
            </h3>
            <p className="text-amber-700 dark:text-amber-400 mb-4">
              To get started with Booking-List, please select whether you are a hotel agent or host.
            </p>
            <div className="flex gap-4">              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    if (user) {
                      await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          firebaseUid: user.uid,
                          email: user.email,
                          displayName: user.displayName || user.email?.split('@')[0],
                          role: UserRole.AGENT,
                        }),
                      });
                      router.push('/agent-dashboard');
                    }
                  } catch (error) {
                    console.error('Error setting role:', error);
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                I&apos;m an Agent
              </button>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    if (user) {
                      await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          firebaseUid: user.uid,
                          email: user.email,
                          displayName: user.displayName || user.email?.split('@')[0],
                          role: UserRole.HOST,
                        }),
                      });
                      router.push('/host-dashboard');
                    }
                  } catch (error) {
                    console.error('Error setting role:', error);
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                I&apos;m a Host
              </button>
            </div>
          </div>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
            After selecting your role, you&apos;ll be redirected to the appropriate dashboard for your needs.
          </p>
        </div>
      </main>
    </div>
  );
}
