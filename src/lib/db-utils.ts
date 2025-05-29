// src/lib/db-utils.ts
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import dbConnect from './mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';

/**
 * Gets the authenticated user from the request
 * @returns Object with userId and role
 */
export async function getAuth(request?: NextRequest) {
  try {
    let firebaseUid = null;
    
    // Try to get the Firebase UID from request cookies or headers
    if (request) {
      // Try to get from cookie in the request
      const authCookie = request.cookies.get('firebaseUid');
      if (authCookie) {
        firebaseUid = authCookie.value;
      }
        // If not found and we have an Authorization header, we could use that
      if (!firebaseUid) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          // Extract the token from the Authorization header
          const token = authHeader.substring(7); // Remove "Bearer " prefix
          
          // In a real app, you would verify the token with Firebase Admin SDK
          // For now, just use the token as the UID for demo purposes
          // This is a simplified approach
          try {
            // Try to get the UID from the cookie again
            const authCookie = request.cookies.get('firebaseUid');
            if (authCookie) {
              firebaseUid = authCookie.value;
            } else {
              // For simplicity in this demo, we'll assume the token is valid
              // and contains the UID. In a real app, you'd verify this.
              console.log('Using Authorization header token as UID');
              firebaseUid = token; // This is a simplification!
            }
          } catch (error) {
            console.error('Error handling Authorization header:', error);
          }
        }
      }
    } else {
      // When no request is provided, try to use server-side cookies API
      try {
        const cookieStore = cookies();
        const uidCookie = cookieStore.get('firebaseUid');
        if (uidCookie) {
          firebaseUid = uidCookie.value;
        }
      } catch (error) {
        console.error('Error accessing cookies:', error);
      }
    }
    
    if (!firebaseUid) {
      return { userId: null, role: null };
    }
    
    // Connect to the database
    await dbConnect();
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return { userId: null, role: null };
    }
    
    return { userId: firebaseUid, role: user.role };
  } catch (error) {
    console.error('Error getting auth:', error);
    return { userId: null, role: null };
  }
}

/**
 * Generates a unique code with a given prefix and length
 * @param prefix The prefix for the code (e.g., 'BOOK')
 * @param length The total length of the code including prefix
 * @returns A unique code string
 */
export async function generateUniqueCode(prefix: string, length: number): Promise<string> {
  // Make sure the length is at least longer than the prefix
  if (length <= prefix.length) {
    length = prefix.length + 4; // Ensure at least 4 random characters
  }
  
  // Number of random characters needed
  const randomLength = length - prefix.length;
  
  // Try up to 10 times to generate a unique code
  for (let attempts = 0; attempts < 10; attempts++) {
    // Generate random alphanumeric string
    let randomPart = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < randomLength; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const code = `${prefix}${randomPart}`;
    
    // Check if this code already exists in the database
    // This assumes we're using this for booking codes, but could be adapted for other uses
    const existingBooking = await mongoose.models.Booking?.findOne({ bookingCode: code });
    
    if (!existingBooking) {
      return code;
    }
  }
  
  // If we couldn't generate a unique code after multiple attempts, add timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
}

/**
 * Verifies the MongoDB connection is working properly
 * @returns Object with connection status and details
 */
export async function verifyDbConnection() {
  try {
    await dbConnect();
    
    // Check if connection is established
    const isConnected = mongoose.connection.readyState === 1;
    
    if (!isConnected) {
      return {
        success: false,
        message: 'Database connection not established',
        details: {
          readyState: mongoose.connection.readyState,
          host: 'Unknown',
          name: 'Unknown',
        }
      };
    }
    
    // Get connection details
    const { host, name } = mongoose.connection;
    
    return {
      success: true,
      message: 'Successfully connected to MongoDB',
      details: {
        readyState: mongoose.connection.readyState,
        host,
        name,
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.stack : String(error),
      }
    };
  }
}
