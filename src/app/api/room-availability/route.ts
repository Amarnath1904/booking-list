import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking, { BookingStatus } from '@/models/Booking';
import Room from '@/models/Room';
import mongoose from 'mongoose';

// GET /api/room-availability?roomId=123&year=2025&month=5
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const roomId = url.searchParams.get('roomId');
    const year = parseInt(url.searchParams.get('year') || '0');
    const month = parseInt(url.searchParams.get('month') || '0');
    
    if (!roomId || !mongoose.isValidObjectId(roomId)) {
      return NextResponse.json(
        { error: 'Valid roomId is required' },
        { status: 400 }
      );
    }
    
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Valid year and month (1-12) are required' },
        { status: 400 }
      );
    }
    
    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
    const endDate = new Date(year, month, 0); // Last day of the month
    
    // Find bookings that overlap with the month
    const bookings = await Booking.find({
      roomId: new mongoose.Types.ObjectId(roomId),
      bookingStatus: { $ne: BookingStatus.REJECTED },
      $or: [
        // Bookings that start before month end and end after month start
        { 
          checkInDate: { $lte: endDate },
          checkOutDate: { $gte: startDate }
        }
      ]
    }).select('checkInDate checkOutDate bookingStatus');
    
    // Calculate unavailable dates
    const unavailableDates: string[] = [];
    const daysInMonth = endDate.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      
      // Check if date is booked in any confirmed or pending booking
      const isDateBooked = bookings.some(booking => {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        return currentDate >= checkIn && currentDate < checkOut;
      });
      
      if (isDateBooked) {
        unavailableDates.push(currentDate.toISOString().split('T')[0]);
      }
    }
    
    return NextResponse.json({
      roomId,
      year,
      month,
      unavailableDates
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
    return NextResponse.json(
      { error: 'Failed to check room availability' },
      { status: 500 }
    );
  }
}
