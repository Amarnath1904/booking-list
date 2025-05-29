// src/app/api/users/[uid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    await dbConnect();
    const { uid } = params;
    
    const user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user in API route (GET /api/users/[uid]):', error); // Added detailed logging
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, // Optionally include error message in response for debugging
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    await dbConnect();
    const { uid } = params;
    const data = await request.json();
    
    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      data,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user in API route (PUT /api/users/[uid]):', error); // Added detailed logging
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, // Optionally include error message in response for debugging
      { status: 500 }
    );
  }
}
