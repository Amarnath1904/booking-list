import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking, { BookingStatus } from '@/models/Booking';
import mongoose from 'mongoose';
import { getTokenFromRequest } from '@/app/utils/auth-helpers';
import { auth } from '@/firebase/config';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/bookings/[id] - Get booking by ID
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = params;
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(id)
      .populate('propertyId')
      .populate('roomId');
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Update booking status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = params;
    
    // Validate token for host authentication
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    try {
      await auth.verifyIdToken(token);
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    // Only allow updating the status
    if (!data.bookingStatus || !Object.values(BookingStatus).includes(data.bookingStatus)) {
      return NextResponse.json(
        { error: 'Invalid booking status' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update the booking status
    booking.bookingStatus = data.bookingStatus;
    await booking.save();
    
    return NextResponse.json({
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
