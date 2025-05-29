import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Room from '@/models/Room';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

// GET handler to fetch rooms (can be filtered by propertyId)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { userId } = await getAuth(request);
    const url = new URL(request.url);
    const propertyId = url.searchParams.get('propertyId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let query = {};
    
    if (propertyId) {
      // Check if the property belongs to the user
      const property = await Property.findById(propertyId);
      
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
      
      if (property.hostId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      
      query = { propertyId };
    } else {
      // If no propertyId specified, fetch rooms for all properties owned by the user
      const properties = await Property.find({ hostId: userId });
      const propertyIds = properties.map(p => p._id);
      query = { propertyId: { $in: propertyIds } };
    }

    const rooms = await Room.find(query);
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST handler to create a new room
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { userId } = await getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { propertyId, pricingType, roomCategory, ratePerRoom, capacity, amenities, images, 
            extraPersonCharge, agentCommission, advanceAmount } = data;

    // Validate required fields
    if (!propertyId || !pricingType || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if the property exists and belongs to the current user
    const property = await Property.findById(propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to add rooms to this property' },
        { status: 403 }
      );
    }

    // Create a new room
    const room = await Room.create({
      propertyId,
      pricingType,
      roomCategory,
      ratePerRoom,
      capacity,
      amenities,
      images,
      extraPersonCharge,
      agentCommission,
      advanceAmount
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
