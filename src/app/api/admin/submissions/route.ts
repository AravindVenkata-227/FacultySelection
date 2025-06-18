
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSheetData } from '@/services/google-sheets-service';

export const dynamic = 'force-dynamic'; // Opt into dynamic behavior

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('admin-auth-token')?.value;

  if (!authToken || authToken !== 'true') { // Simple check for prototype
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getSheetData();
    if (data === null) { // This means there was an error in getSheetData like client init failure
        return NextResponse.json({ message: 'Failed to retrieve data from source. Service unavailable.' }, { status: 503 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('API submissions error:', error);
    return NextResponse.json({ message: 'Failed to fetch submissions' }, { status: 500 });
  }
}

