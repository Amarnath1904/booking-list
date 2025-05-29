import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RoomCategory from '@/models/RoomCategory';
import Property from '@/models/Property';
import { getAuth } from '@/lib/db-utils';

// GET handler to fetch a single room category
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

    const category = await RoomCategory.findById(params.id);

    if (!category) {
      return NextResponse.json(
        { error: 'Room category not found' },
        { status: 404 }
      );
    }

    // Check if the category's property belongs to the user
    const property = await Property.findById(category.propertyId);
    
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

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching room category:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT handler to update a room category
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

    const category = await RoomCategory.findById(params.id);

    if (!category) {
      return NextResponse.json(
        { error: 'Room category not found' },
        { status: 404 }
      );
    }

    // Check if the category's property belongs to the user
    const property = await Property.findById(category.propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Associated property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to update this category' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { name, description } = data;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if the new name already exists for this property (if name is being changed)
    if (name !== category.name) {
      const existingCategory = await RoomCategory.findOne({
        propertyId: category.propertyId,
        name,
        _id: { $ne: params.id }
      });
      
      if (existingCategory) {
        return NextResponse.json(
          { error: 'A category with this name already exists for this property' },
          { status: 409 }
        );
      }
    }

    // Update the category
    const updatedCategory = await RoomCategory.findByIdAndUpdate(
      params.id,
      { $set: { name, description } },
      { new: true }
    );

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating room category:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove a room category
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

    const category = await RoomCategory.findById(params.id);

    if (!category) {
      return NextResponse.json(
        { error: 'Room category not found' },
        { status: 404 }
      );
    }

    // Check if the category's property belongs to the user
    const property = await Property.findById(category.propertyId);
    
    if (!property) {
      return NextResponse.json(
        { error: 'Associated property not found' },
        { status: 404 }
      );
    }
    
    if (property.hostId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to delete this category' },
        { status: 403 }
      );
    }

    // TODO: Consider checking if rooms are using this category before deletion
    // or implementing a cascade update/delete

    await RoomCategory.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Room category deleted successfully' });
  } catch (error) {
    console.error('Error deleting room category:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
