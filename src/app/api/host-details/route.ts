import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data = await request.json();
    console.log('Received data:', data);
    
    // Get the authenticated user ID from the request
    const { userId } = await getAuth(request);
    const firebaseUid = userId || data.firebaseUid;
    
    if (!firebaseUid) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid user ID found' },
        { status: 401 }
      );
    }
    
    const {
      propertyName,
      location,
      phoneNumber,
      alternateNumber,
      upiId,
      bankAccountName,
      numberOfRooms,
      pricingType,
    } = data;    if (!firebaseUid || !propertyName || !location || !phoneNumber || !upiId || !bankAccountName || !numberOfRooms || !pricingType) {
      console.log('Missing required fields', { 
        firebaseUid, propertyName, location, phoneNumber, 
        upiId, bankAccountName, numberOfRooms, pricingType 
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          phoneNumber,
          alternateNumber,
          upiId,
          bankAccountName,
        },
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create a property in the Property collection
    const property = await Property.create({
      hostId: firebaseUid,
      name: propertyName,
      location: location,
      numberOfRooms: numberOfRooms,
      pricingType: pricingType,
      pricePerUnit: 1000, // Default price
      description: 'A comfortable property with all amenities',
      amenities: ['WiFi', 'AC', 'TV', 'Kitchen'],
    });

    // Return full user object with property data
    return NextResponse.json({
      user,
      property
    });} catch (error) {
    console.error('Error saving host details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
