import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RoomCategory from '@/models/RoomCategory';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

// GET handler to fetch room categories (filtered by propertyId)
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

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

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

    const categories = await RoomCategory.find({ propertyId });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching room categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST handler to create a new room category
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
    const { propertyId, name, description } = data;

    if (!propertyId || !name) {
      return NextResponse.json(
        { error: 'Property ID and name are required' },
        { status: 400 }
      );
    }

    // Check if the property exists and belongs to the user
    const property = await Property.findById(propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to add categories to this property' },
        { status: 403 }
      );
    }

    // Check if the category already exists for this property
    const existingCategory = await RoomCategory.findOne({ propertyId, name });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists for this property' },
        { status: 409 }
      );
    }

    // Create a new room category
    const category = await RoomCategory.create({
      propertyId,
      name,
      description
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating room category:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
