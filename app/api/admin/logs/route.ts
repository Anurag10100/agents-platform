import { NextRequest } from 'next/server';
import { getLogs, getStats, getLogById, clearLogs } from '@/app/lib/generation-logs';
import { checkRateLimit, getClientIdentifier } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Rate limiting: 120 requests per minute per IP
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`admin-logs:${clientId}`, 120, 60000);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    // Get stats
    if (action === 'stats') {
      const stats = getStats();
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get single log by ID
    const logId = searchParams.get('id');
    if (logId) {
      const log = getLogById(logId);
      if (!log) {
        return new Response(
          JSON.stringify({ error: 'Log not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify(log), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get logs list with validation
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);
    const skillId = searchParams.get('skillId') || undefined;
    const status = searchParams.get('status') as 'success' | 'error' | undefined;

    const result = getLogs({ limit, offset, skillId, status: status || undefined });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch logs';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP (destructive action)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`admin-logs-delete:${clientId}`, 10, 60000);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    clearLogs();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear logs';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
