import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

// GET handler to fetch properties
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { userId, role } = await getAuth(request);

    console.log('Fetching properties for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch properties for the host
    const properties = await Property.find({ hostId: userId });
    console.log(`Found ${properties.length} properties for user ${userId}`);

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST handler to create a new property
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
    console.log('Creating property with data:', data);
    
    // Validate required fields
    if (!data.name || !data.location || !data.numberOfRooms || !data.pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create a new property with the host ID
    const property = await Property.create({
      ...data,
      hostId: userId
    });

    console.log('Created property:', property);
    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
