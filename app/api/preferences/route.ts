import { NextRequest, NextResponse } from 'next/server';
import { loadPreferences, savePreferences } from '../../../lib/preferences';
import { UserPreferences } from '../../../lib/database.types';
import {
  preferencesSchema,
  validateRequest,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 120 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`preferences:${clientId}`, 120, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    const preferences = await loadPreferences();
    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load preferences';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`preferences:${clientId}`, 30, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequest(preferencesSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request: ${validation.error}` },
        { status: 400 }
      );
    }

    const preferences = await savePreferences(validation.data as Partial<UserPreferences>);
    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
