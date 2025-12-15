import { NextRequest } from 'next/server';
import { getLogs, getStats, getLogById, clearLogs } from '@/app/lib/generation-logs';

export async function GET(request: NextRequest) {
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

    // Get logs list
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const skillId = searchParams.get('skillId') || undefined;
    const status = searchParams.get('status') as 'success' | 'error' | undefined;

    const result = getLogs({ limit, offset, skillId, status: status || undefined });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    clearLogs();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to clear logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
