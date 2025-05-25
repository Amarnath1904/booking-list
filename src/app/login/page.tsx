'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from '@/firebase/config';
import { validateEmail, validatePassword } from '../utils/validation';
import { setCookie } from '../utils/cookies';

// Define the UserRole enum here to avoid importing from models
// (which could cause issues with server/client components)
enum UserRole {
  AGENT = 'agent',
  HOST = 'host',
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.AGENT);
  const router = useRouter();
  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          // Check if user exists in our database
          const response = await fetch(`/api/users/${user.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            // Set session cookie
            document.cookie = `session=${user.uid}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
            // Redirect based on role
            if (userData.role === UserRole.AGENT) {
              router.push('/agent-dashboard');
            } else {
              router.push('/host-dashboard');
            }
          } else if (response.status === 404) {
            // User doesn't exist in our database yet, keep them on the login page
            // They'll need to complete registration
          } else {
            console.error('Error checking user:', await response.text());
          }
        } catch (error) {
          console.error('Error checking user:', error);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  const createUserInDatabase = async (firebaseUser: User, role: UserRole) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || email.split('@')[0],
          role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user profile');
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Validate password for sign up
    if (isSignUp) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message || 'Invalid password');
        return;
      }
    }
    
    setLoading(true);

    try {      if (isSignUp) {
        // Create a new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;        // Create user in database
        await createUserInDatabase(user, userRole);
        
        // Set session and role cookies
        setCookie('session', user.uid, 7); // 7 days
        setCookie('role', userRole, 7); // 7 days
        
        // Redirect based on role
        if (userRole === UserRole.AGENT) {
          router.push('/agent-dashboard');
        } else {
          router.push('/host-dashboard');
        }    
      } else {
        // Sign in existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check user role and redirect accordingly
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          
          if (response.ok) {            const userData = await response.json();
            
            // Set session and role cookies
            setCookie('session', user.uid, 7); // 7 days
            setCookie('role', userData.role, 7); // 7 days
            
            if (userData.role === UserRole.AGENT) {
              router.push('/agent-dashboard');
            } else {
              router.push('/host-dashboard');
            }
          } else {
            // If we can't get user role, default to general dashboard
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const authError = error as AuthError;
      setError(
        authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : authError.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : authError.code === 'auth/weak-password'
          ? 'Password should be at least 6 characters'
          : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in our database
      const userResponse = await fetch(`/api/users/${user.uid}`);
      
      if (userResponse.status === 404) {
        if (isSignUp) {
          // If this is a sign up, create the user with the selected role
          await createUserInDatabase(user, userRole);
          
          // Redirect based on role
          if (userRole === UserRole.AGENT) {
            router.push('/agent-dashboard');
          } else {
            router.push('/host-dashboard');
          }
        } else {
          // If this is a sign in but user doesn&apos;t exist in our DB yet,
          // send them to the dashboard to select a role
          router.push('/dashboard');
        }
      } else if (userResponse.ok) {
        // User exists, redirect based on their saved role
        const userData = await userResponse.json();
        if (userData.role === UserRole.AGENT) {
          router.push('/agent-dashboard');
        } else {
          router.push('/host-dashboard');
        }
      } else {
        // Default redirect if we can&apos;t determine role
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      const authError = error as AuthError;
      setError(
        authError.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : 'Failed to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Password reset form
  if (resetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Booking-List</h1>
            </Link>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-6">
              Reset Your Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {resetSent 
                ? 'Check your email for a reset link' 
                : 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {resetSent ? (
            <div className="mb-6 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
              <p>Password reset email sent. Check your inbox and follow the instructions to reset your password.</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-70"
              >
                {loading ? 'Processing...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
                setError('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login/Sign up form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Booking-List</h1>
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-6">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {isSignUp
              ? 'Sign up to start managing your hotel'
              : 'Sign in to access your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                I am a
              </label>
              <select
                id="role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                required
              >
                <option value={UserRole.AGENT}>Hotel Agent</option>
                <option value={UserRole.HOST}>Hotel Host</option>
              </select>
            </div>
          )}

          {!isSignUp && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setResetMode(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-70"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 py-2 rounded-lg transition-colors disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}