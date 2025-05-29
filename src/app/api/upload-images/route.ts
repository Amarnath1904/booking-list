import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuth } from '@/lib/db-utils';
import { handleImageUpload } from '@/lib/upload-utils-mongodb';

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

    const imageUrls = await handleImageUpload(request);
    
    return NextResponse.json({ 
      success: true, 
      imageUrls,
      count: imageUrls.length
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Configure the API route to accept large uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
