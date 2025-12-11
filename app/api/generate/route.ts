import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Valid media types for images
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt, images, pdfs } = await request.json();

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: systemPrompt and userPrompt' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Build the message content array with proper Anthropic types
    const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

    // Add images if provided
    if (images && Array.isArray(images)) {
      for (const image of images) {
        // Validate and cast media type
        const mediaType = image.source.media_type as string;
        const validMediaTypes: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (validMediaTypes.includes(mediaType as ImageMediaType)) {
          (messageContent as Anthropic.ImageBlockParam[]).push({
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

    // Add PDFs if provided (Claude supports PDF documents via base64)
    if (pdfs && Array.isArray(pdfs)) {
      for (const pdf of pdfs) {
        (messageContent as Anthropic.DocumentBlockParam[]).push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdf.data,
          },
        });
      }
    }

    // Add the text prompt
    (messageContent as Anthropic.TextBlockParam[]).push({
      type: 'text',
      text: userPrompt,
    });

    const message = await anthropic.messages.create({
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

    // Extract text content from the response
    const textContent = message.content.find((block) => block.type === 'text');
    const content = textContent && 'text' in textContent ? textContent.text : '';

    return NextResponse.json({
      content,
      usage: message.usage,
    });
  } catch (error: any) {
    console.error('API Error:', error);

    // Handle specific Anthropic API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.status === 413) {
      return NextResponse.json(
        { error: 'Request too large. Please reduce file sizes or remove some files.' },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An error occurred while generating content' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
