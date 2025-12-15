import { NextRequest, NextResponse } from 'next/server';
import { loadPreferences, savePreferences } from '../../../lib/preferences';
import { UserPreferences } from '../../../lib/database.types';

export async function GET() {
  try {
    const preferences = await loadPreferences();
    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const preferences = await savePreferences(body as Partial<UserPreferences>);
    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
