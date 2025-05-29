'use client';

import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/constants/userRoles';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const { user, userRole, loading, signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    // If user has a specific role, redirect them to their respective dashboard
    if (user && !loading && userRole) {
      if (userRole === UserRole.AGENT) {
        router.push('/agent-dashboard');
        return;
      } else if (userRole === UserRole.HOST) {
        router.push('/host-dashboard');
        return;
      }
    }
    
    // This would normally fetch real data from an API
    // Simulating API call with mock data for now
    const fetchStats = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock different stats based on user role
      if (userRole === UserRole.AGENT) {
        setStats({
          totalBookings: 28,
          pendingBookings: 5,
          completedBookings: 23,
          totalRevenue: 4350,
        });
      } else if (userRole === UserRole.HOST) {
        setStats({
          totalBookings: 12,
          pendingBookings: 3,
          completedBookings: 9,
          totalRevenue: 2800,
        });
      }
    };

    if (user && userRole) {
      fetchStats();
    }
  }, [user, userRole, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p>Please login to view your dashboard.</p>
        <Link href="/login" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Go to Login
        </Link>
      </div>
    );
  }

  // User is authenticated but doesn't have a role yet
  if (user && !userRole) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Booking-List
            </h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700">
                You are logged in as: <span className="font-medium">{user.email}</span>
              </p>
            </div>
            
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Please Select Your Role
              </h3>
              <p className="text-amber-700 mb-4">
                To get started with Booking-List, please select whether you are a hotel agent or host.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">              
                <button 
                  onClick={async () => {
                    setIsLoading(true);
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
                      setIsLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                >
                  I&apos;m an Agent
                </button>
                <button 
                  onClick={async () => {
                    setIsLoading(true);
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
                      setIsLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  I&apos;m a Host
                </button>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              After selecting your role, you&apos;ll be redirected to the appropriate dashboard for your needs.
            </p>
            
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Welcome back, {user.displayName || user.email?.split('@')[0] || 'User'}
      </p>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stats Cards */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalBookings}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Pending Bookings</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingBookings}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Completed Bookings</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.completedBookings}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">${stats.totalRevenue}</dd>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Role-specific Dashboards</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={`bg-white shadow rounded-lg overflow-hidden ${
            userRole === UserRole.AGENT ? 'border-2 border-indigo-500' : ''
          }`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Agent Dashboard</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage bookings, view customer information, and track your commissions.
              </p>
              <div className="mt-4">
                <Link href="/agent-dashboard" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Go to Agent Dashboard
                </Link>
              </div>
            </div>
          </div>
          
          <div className={`bg-white shadow rounded-lg overflow-hidden ${
            userRole === UserRole.HOST ? 'border-2 border-indigo-500' : ''
          }`}>
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Host Dashboard</h3>
              <p className="mt-1 text-sm text-gray-600">
                Manage your properties, view bookings, and track your earnings.
              </p>
              <div className="mt-4">
                <Link href="/host-dashboard" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Go to Host Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

