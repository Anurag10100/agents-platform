import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Valid media types for images
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt, images } = await request.json();

    if (!systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: systemPrompt and userPrompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
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
    const stream = await anthropic.messages.stream({
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
  } catch (error: any) {
    console.error('API Error:', error);

    if (error.status === 401) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred while generating content' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
