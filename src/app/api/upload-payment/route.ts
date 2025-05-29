import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { uploadImage } from '@/lib/upload-utils-mongodb';
import mongoose from 'mongoose';

// POST /api/upload-payment
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const formData = await req.formData();
    const bookingId = formData.get('bookingId') as string;
    const screenshot = formData.get('screenshot') as File;
    
    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      return NextResponse.json(
        { error: 'Valid bookingId is required' },
        { status: 400 }
      );
    }
    
    if (!screenshot || !(screenshot instanceof File)) {
      return NextResponse.json(
        { error: 'Payment screenshot is required' },
        { status: 400 }
      );
    }
    
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(screenshot.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }
      // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (screenshot.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }
    
    // Upload the image to MongoDB (stored as base64)
    const folder = `payments/${bookingId}`;
    const uploadResult = await uploadImage(screenshot, folder);
    
    if (!uploadResult.secure_url) {
      return NextResponse.json(
        { error: 'Failed to upload payment screenshot' },
        { status: 500 }
      );
    }
    
    // Update the booking with the screenshot URL (base64 data URL)
    booking.paymentScreenshotUrl = uploadResult.secure_url;
    await booking.save();
    
    return NextResponse.json({
      message: 'Payment screenshot uploaded successfully',
      screenshotUrl: uploadResult.secure_url
    });
  } catch (error) {
    console.error('Error uploading payment screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to upload payment screenshot' },
      { status: 500 }
    );
  }
}
