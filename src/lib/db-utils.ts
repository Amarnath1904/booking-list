// src/lib/db-utils.ts
import dbConnect from './mongodb';
import mongoose from 'mongoose';

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
