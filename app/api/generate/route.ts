import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  generateRequestSchema,
  validateRequest,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/security';

// Valid media types for images
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

// Initialize Anthropic client lazily to allow env validation
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`generate:${clientId}`, 30, 60000);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequest(generateRequestSchema, body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: `Invalid request: ${validation.error}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { systemPrompt, userPrompt, images } = validation.data;

    // Get Anthropic client (validates API key)
    let client: Anthropic;
    try {
      client = getAnthropicClient();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the message content array
    const messageContent: (
      | Anthropic.TextBlockParam
      | Anthropic.ImageBlockParam
    )[] = [];

    // Add images if provided
    if (images && Array.isArray(images)) {
      for (const image of images) {
        const mediaType = image.source.media_type as string;
        const validMediaTypes: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (validMediaTypes.includes(mediaType as ImageMediaType)) {
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as ImageMediaType,
              data: image.source.data,
            },
          });
        }
      }
    }

    // Add the text prompt
    messageContent.push({
      type: 'text',
      text: userPrompt,
    });

    // Use streaming for faster response
    const stream = await client.messages.stream({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);

    // Handle Anthropic API errors
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message?: string };

      if (apiError.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (apiError.status === 429) {
        return new Response(
          JSON.stringify({ error: 'API rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred while generating content';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
