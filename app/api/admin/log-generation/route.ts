import { NextRequest } from 'next/server';
import { addLog } from '@/app/lib/generation-logs';
import {
  logGenerationRequestSchema,
  validateRequest,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 100 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`log-generation:${clientId}`, 100, 60000);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    // Note: Using loose validation here since logs come from internal calls
    const {
      skillId,
      skillName,
      inputData,
      sourceUrl,
      customInstructions,
      outputFormat,
      output,
      imagesCount,
      urlImagesCount,
      durationMs,
      status,
      error: errorMessage,
    } = body;

    const log = addLog({
      skillId: skillId || 'unknown',
      skillName: skillName || 'Unknown Skill',
      inputData: inputData || {},
      sourceUrl,
      customInstructions,
      outputFormat: outputFormat || 'text',
      outputLength: output?.length || 0,
      outputPreview: output ? output.substring(0, 500) : '',
      fullOutput: output || '',
      imagesCount: imagesCount || 0,
      urlImagesCount: urlImagesCount || 0,
      durationMs: durationMs || 0,
      status: status || 'success',
      error: errorMessage,
    });

    return new Response(JSON.stringify({ success: true, logId: log.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Log generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to log generation';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
