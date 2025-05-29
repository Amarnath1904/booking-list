import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Room from '@/models/Room';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

// GET handler to fetch a single room by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { userId } = await getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const room = await Room.findById(params.id);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if the room's property belongs to the current user
    const property = await Property.findById(room.propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Associated property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT handler to update a room
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { userId } = await getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const room = await Room.findById(params.id);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if the room's property belongs to the current user
    const property = await Property.findById(room.propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Associated property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to update this room' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { pricingType, roomCategory, ratePerRoom, capacity, amenities, images, 
            extraPersonCharge, agentCommission, advanceAmount } = data;

    // Update the room
    const updatedRoom = await Room.findByIdAndUpdate(
      params.id,
      { $set: {
        pricingType,
        roomCategory,
        ratePerRoom,
        capacity,
        amenities,
        images,
        extraPersonCharge,
        agentCommission,
        advanceAmount
      } },
      { new: true }
    );

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { userId } = await getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const room = await Room.findById(params.id);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if the room's property belongs to the current user
    const property = await Property.findById(room.propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Associated property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to delete this room' },
        { status: 403 }
      );
    }

    await Room.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
