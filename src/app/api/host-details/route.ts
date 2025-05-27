import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuth } from '@/lib/db-utils';

// This endpoint is now only used to check if a host exists and to get their profile status
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data = await request.json();
    console.log('Received data:', data);
    
    // Get the authenticated user ID from the request
    const { userId } = await getAuth(request);
    const uid = userId || data.firebaseUid;
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid user ID found' },
        { status: 401 }
      );
    }
    
    // Simply validate the user exists
    const user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the user profile is complete
    // A complete profile now only requires a displayName
    const hasCompletedProfile = Boolean(user.displayName);

    // Return user object and profile status
    return NextResponse.json({
      user,
      profileComplete: hasCompletedProfile
    });
  } catch (error) {
    console.error('Error checking host details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
