/**
 * Security utilities for sanitization and validation
 */
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Configure DOMPurify for safe HTML rendering
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'sup', 'sub',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'style',
    'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}

/**
 * Sanitize text content (escapes HTML entities)
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============ API Input Validation Schemas ============

/**
 * Schema for the generate API endpoint
 */
export const generateRequestSchema = z.object({
  systemPrompt: z.string().min(1, 'System prompt is required').max(50000, 'System prompt too long'),
  userPrompt: z.string().min(1, 'User prompt is required').max(100000, 'User prompt too long'),
  images: z.array(z.object({
    type: z.literal('image'),
    source: z.object({
      type: z.literal('base64'),
      media_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
      data: z.string(),
    }),
  })).optional(),
});

/**
 * Schema for the fetch-url API endpoint
 */
export const fetchUrlRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  fetchImages: z.boolean().optional().default(true),
});

/**
 * Schema for preferences API endpoint
 */
export const preferencesSchema = z.object({
  brand_name: z.string().max(100).optional(),
  brand_colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  }).optional(),
  tone_of_voice: z.enum(['professional', 'casual', 'formal', 'friendly', 'authoritative']).optional(),
  industry: z.string().max(50).optional(),
  target_audience: z.string().max(200).optional(),
  boilerplate_text: z.string().max(2000).optional(),
  contact_info: z.object({
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().optional(),
    address: z.string().max(200).optional(),
  }).optional(),
  social_links: z.object({
    twitter: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
  }).optional(),
}).partial();

/**
 * Schema for data sources API endpoint
 */
export const dataSourcesRequestSchema = z.object({
  action: z.enum([
    'fetch',
    'fetch-multiple',
    'fetch-rss',
    'fetch-predefined-rss',
    'fetch-sheets',
    'fetch-airtable',
    'fetch-database',
    'list-predefined-feeds',
  ]),
  sources: z.array(z.any()).optional(),
  source: z.any().optional(),
  options: z.object({
    asMarkdown: z.boolean().optional(),
  }).optional(),
  // RSS-specific fields
  url: z.string().url().optional(),
  name: z.string().max(100).optional(),
  maxItems: z.number().int().min(1).max(100).optional(),
  categories: z.array(z.string()).optional(),
  // Sheets-specific fields
  spreadsheetId: z.string().optional(),
  spreadsheetUrl: z.string().url().optional(),
  sheetName: z.string().max(100).optional(),
  range: z.string().max(50).optional(),
  apiKey: z.string().optional(),
  // Airtable-specific fields
  baseId: z.string().optional(),
  tableName: z.string().max(100).optional(),
  view: z.string().max(100).optional(),
  maxRecords: z.number().int().min(1).max(1000).optional(),
  filterByFormula: z.string().max(500).optional(),
  // Database-specific fields
  supabaseUrl: z.string().url().optional(),
  supabaseKey: z.string().optional(),
  table: z.string().max(100).optional(),
  query: z.string().max(1000).optional(),
  // Predefined feeds
  feedIds: z.array(z.string()).optional(),
  category: z.string().max(50).optional(),
});

/**
 * Schema for generation log API endpoint
 */
export const logGenerationRequestSchema = z.object({
  skillId: z.string().max(50),
  skillName: z.string().max(100),
  inputData: z.object({
    message: z.string().max(10000),
  }),
  sourceUrl: z.string().url().optional(),
  outputFormat: z.enum(['html', 'markdown', 'text']),
  output: z.string().max(500000),
  imagesCount: z.number().int().min(0).optional(),
  urlImagesCount: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0),
  status: z.enum(['success', 'error']),
  errorMessage: z.string().max(1000).optional(),
});

// ============ Validation Helper ============

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validate request body against a schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError<T>;
      const messages = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join('; ') };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

// ============ Environment Validation ============

/**
 * Required environment variables
 */
const requiredEnvVars = ['ANTHROPIC_API_KEY'] as const;

/**
 * Validate that required environment variables are set
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get a required environment variable or throw
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ============ Rate Limiting ============

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter
 * For production, use Redis or similar
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now
  };
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// ============ CSRF Protection ============

/**
 * CSRF Protection Header Name
 * Requiring a custom header provides CSRF protection because:
 * 1. Browsers don't allow custom headers in cross-origin requests without CORS preflight
 * 2. Forms can't set custom headers
 * 3. Only JavaScript from the same origin can set this header
 */
export const CSRF_HEADER_NAME = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'XMLHttpRequest';

/**
 * Validate CSRF protection header
 * This provides protection against CSRF attacks by requiring a custom header
 * that can only be set by JavaScript from the same origin.
 */
export function validateCsrfHeader(request: Request): boolean {
  const headerValue = request.headers.get(CSRF_HEADER_NAME);
  return headerValue === CSRF_HEADER_VALUE;
}

/**
 * Create CSRF error response
 */
export function createCsrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'CSRF validation failed. Please ensure you are making requests from the application.',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
