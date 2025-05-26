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
    
    // First try to get the token from the Authorization header if request is provided
    if (request) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token
        const token = authHeader.split(' ')[1];
        // In a real app, you would verify this token with Firebase Admin SDK
        // For now, we'll just use it as the UID for demonstration
        if (token) {
          firebaseUid = token;
        }
      }
    }
    
    // If no token in header, try to get from cookies
    if (!firebaseUid) {
      const cookieStore = cookies();
      firebaseUid = cookieStore.get('firebaseUid')?.value;
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
