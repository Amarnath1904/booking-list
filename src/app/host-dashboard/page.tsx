'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/firebase/config';

enum UserRole {
  AGENT = 'agent',
  HOST = 'host',
}

export default function HostDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        try {
          // Fetch user role
          const response = await fetch(`/api/users/${currentUser.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
            
            // Make sure this user is a host
            if (userData.role !== UserRole.HOST) {
              router.push('/agent-dashboard');
            }
          } else {
            console.error('Failed to fetch user data');
            router.push('/login');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          router.push('/login');
        }
      } else {
        router.push('/login');
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
            {user?.email} <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Host</span>
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
            Host Dashboard
          </h2>
          
          <div className="mb-6 p-4 bg-blue-50 dark:bg-slate-700 rounded-lg">
            <p className="text-slate-700 dark:text-slate-300">
              Welcome to your host dashboard. Here you can manage your properties, listings, and monitor bookings.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-100 dark:bg-slate-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                Active Properties
              </h3>
              <p className="text-slate-600 dark:text-slate-400">0 properties listed</p>
            </div>
            
            <div className="bg-green-100 dark:bg-slate-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                Total Bookings
              </h3>
              <p className="text-slate-600 dark:text-slate-400">0 bookings received</p>
            </div>
            
            <div className="bg-green-100 dark:bg-slate-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                Revenue
              </h3>
              <p className="text-slate-600 dark:text-slate-400">$0.00</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Host Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-green-50 dark:bg-slate-600 rounded-lg text-green-600 dark:text-green-300 font-medium hover:bg-green-100 dark:hover:bg-slate-500 transition-colors">
                  Add New Property
                </button>
                <button className="p-3 bg-green-50 dark:bg-slate-600 rounded-lg text-green-600 dark:text-green-300 font-medium hover:bg-green-100 dark:hover:bg-slate-500 transition-colors">
                  View Bookings
                </button>
                <button className="p-3 bg-green-50 dark:bg-slate-600 rounded-lg text-green-600 dark:text-green-300 font-medium hover:bg-green-100 dark:hover:bg-slate-500 transition-colors">
                  Pricing Settings
                </button>
                <button className="p-3 bg-green-50 dark:bg-slate-600 rounded-lg text-green-600 dark:text-green-300 font-medium hover:bg-green-100 dark:hover:bg-slate-500 transition-colors">
                  Financial Reports
                </button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                Recent Bookings
              </h3>
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-400 text-sm">No recent bookings to display</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
