import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const data = await request.json();    const {
      propertyName,
      location,
      phoneNumber,
      alternateNumber,
      upiId,
      bankAccountName,
      numberOfRooms,
      pricingAmount,
      pricingType,
    } = data;

    if (!propertyName || !location || !phoneNumber || !upiId || !bankAccountName || !numberOfRooms || !pricingAmount || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: data.firebaseUid },
      {
        $set: {
          propertyName,
          location,
          phoneNumber,
          alternateNumber,          upiId,
          bankAccountName,
          numberOfRooms,
          pricingAmount,
          pricingType,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error saving host details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
