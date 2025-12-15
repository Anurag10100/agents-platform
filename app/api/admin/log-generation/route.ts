import { NextRequest } from 'next/server';
import { addLog } from '@/app/lib/generation-logs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
      error,
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
      error,
    });

    return new Response(JSON.stringify({ success: true, logId: log.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Log generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to log generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
