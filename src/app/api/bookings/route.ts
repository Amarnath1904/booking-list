import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking, { BookingStatus } from '@/models/Booking';
import Property from '@/models/Property';
import Room from '@/models/Room';
import mongoose from 'mongoose';
import { generateUniqueCode } from '@/lib/db-utils';

// GET /api/bookings - Get all bookings
// GET /api/bookings?propertyId=123 - Get bookings for a property
// GET /api/bookings?roomId=123 - Get bookings for a room
export async function GET(req: NextRequest) {  try {
    await dbConnect();
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const roomId = url.searchParams.get('roomId');
    const status = url.searchParams.get('status');
    
    let query: any = {};
    
    if (propertyId) {
      query.propertyId = new mongoose.Types.ObjectId(propertyId);
    }
    
    if (roomId) {
      query.roomId = new mongoose.Types.ObjectId(roomId);
    }
    
    if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
      query.bookingStatus = status;
    }
    
    const bookings = await Booking.find(query)
      .populate('propertyId', 'name location')
      .populate('roomId', 'roomCategory capacity')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create a new booking
export async function POST(req: NextRequest) {  try {
    await dbConnect();
    const data = await req.json();
    
    // Check if required fields are present
    const requiredFields = [
      'propertyId', 'roomId', 'guestName', 'guestEmail', 
      'guestPhone', 'guestAddress', 'checkInDate', 'checkOutDate'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate IDs
    if (!mongoose.isValidObjectId(data.propertyId) || !mongoose.isValidObjectId(data.roomId)) {
      return NextResponse.json(
        { error: 'Invalid property or room ID' },
        { status: 400 }
      );
    }
    
    // Check if property and room exist
    const property = await Property.findById(data.propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    const room = await Room.findById(data.roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Check if room belongs to property
    if (room.propertyId.toString() !== data.propertyId) {
      return NextResponse.json(
        { error: 'Room does not belong to the specified property' },
        { status: 400 }
      );
    }
    
    // Validate dates
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid check-in or check-out date format' },
        { status: 400 }
      );
    }
    
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }
    
    // Check for date conflicts with existing bookings
    const conflictingBookings = await Booking.find({
      roomId: data.roomId,
      bookingStatus: { $ne: BookingStatus.REJECTED },
      $or: [
        { 
          checkInDate: { $lt: checkOutDate },
          checkOutDate: { $gt: checkInDate }
        }
      ]
    });
    
    if (conflictingBookings.length > 0) {
      return NextResponse.json(
        { error: 'Room is already booked for the selected dates' },
        { status: 409 }
      );
    }
    
    // Generate a unique booking code
    const bookingCode = await generateUniqueCode('BOOK', 8);
    
    // Create booking
    const newBooking = new Booking({
      ...data,
      checkInDate,
      checkOutDate,
      bookingStatus: BookingStatus.PENDING,
      bookingCode
    });
    
    await newBooking.save();
    
    return NextResponse.json({
      message: 'Booking created successfully',
      booking: newBooking
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
