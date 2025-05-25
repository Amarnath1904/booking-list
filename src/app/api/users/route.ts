// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { UserRole } from '@/constants/userRoles';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data = await request.json();
    
    const { firebaseUid, email, displayName, role } = data;
    
    if (!firebaseUid || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    // Create new user
    const user = await User.create({
      firebaseUid,
      email,
      displayName: displayName || email.split('@')[0],
      role,
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
