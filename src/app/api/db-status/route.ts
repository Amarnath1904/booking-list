// src/app/api/db-status/route.ts
import { NextResponse } from 'next/server';
import { verifyDbConnection } from '@/lib/db-utils';

export async function GET() {
  try {
    const connectionStatus = await verifyDbConnection();
    
    if (connectionStatus.success) {
      return NextResponse.json(connectionStatus, { status: 200 });
    } else {
      return NextResponse.json(connectionStatus, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error checking database connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
