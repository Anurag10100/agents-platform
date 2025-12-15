import { NextRequest } from 'next/server';

interface ExtractedImage {
  url: string;
  alt: string;
  base64?: string;
  mediaType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url, fetchImages = true } = await request.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the URL content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // Extract metadata
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const ogData = extractOpenGraph(html);

    // Extract main content
    const mainContent = extractMainContent(html);
    const articles = extractArticles(html);

    // Extract and fetch images
    let images: ExtractedImage[] = [];
    if (fetchImages) {
      const imageUrls = extractImageUrls(html, validUrl);
      images = await fetchImagesAsBase64(imageUrls, validUrl);
    }

    // Build comprehensive content
    let content = '';

    // Add title and description
    if (title) {
      content += `# ${title}\n\n`;
    }
    if (description) {
      content += `**Summary:** ${description}\n\n`;
    }
    if (ogData.siteName) {
      content += `**Source:** ${ogData.siteName}\n\n`;
    }

    content += '---\n\n';

    // Add main content
    if (mainContent) {
      content += '## Main Content\n\n';
      content += mainContent + '\n\n';
    }

    // Add extracted articles
    if (articles.length > 0) {
      content += '## Articles & Sections\n\n';
      articles.forEach((article) => {
        if (article.title) {
          content += `### ${article.title}\n\n`;
        }
        content += article.content + '\n\n';
      });
    }

    // If no structured content found, use full text extraction
    if (!mainContent && articles.length === 0) {
      content += extractTextFromHtml(html);
    }

    // Limit content size
    const maxLength = 80000;
    const truncatedContent = content.length > maxLength
      ? content.substring(0, maxLength) + '\n\n[Content truncated...]'
      : content;

    return new Response(
      JSON.stringify({
        content: truncatedContent,
        url: validUrl.toString(),
        title,
        description,
        images: images.filter(img => img.base64), // Only return images that were successfully fetched
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Fetch URL Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch URL' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function extractImageUrls(html: string, baseUrl: URL): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  // Extract OG image first (usually the main image)
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage) {
    const imgUrl = resolveUrl(ogImage[1], baseUrl);
    if (imgUrl && !seen.has(imgUrl)) {
      seen.add(imgUrl);
      images.push({ url: imgUrl, alt: 'Featured image' });
    }
  }

  // Also try twitter:image
  const twitterImage = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twitterImage) {
    const imgUrl = resolveUrl(twitterImage[1], baseUrl);
    if (imgUrl && !seen.has(imgUrl)) {
      seen.add(imgUrl);
      images.push({ url: imgUrl, alt: 'Featured image' });
    }
  }

  // Extract images from img tags
  const imgPattern = /<img[^>]*>/gi;
  let match;

  while ((match = imgPattern.exec(html)) !== null) {
    const imgTag = match[0];

    // Get src - try multiple attributes for lazy-loaded images
    let src = '';

    // Try data-src first (lazy loading)
    const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
    if (dataSrcMatch) {
      src = dataSrcMatch[1];
    }

    // Try data-lazy-src
    if (!src) {
      const dataLazySrcMatch = imgTag.match(/data-lazy-src=["']([^"']+)["']/i);
      if (dataLazySrcMatch) {
        src = dataLazySrcMatch[1];
      }
    }

    // Try srcset for higher quality
    if (!src) {
      const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
      if (srcsetMatch) {
        const srcset = srcsetMatch[1];
        const sources = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        src = sources[sources.length - 1] || sources[0];
      }
    }

    // Finally try regular src
    if (!src) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        src = srcMatch[1];
      }
    }

    // Get alt text
    const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? decodeHtmlEntities(altMatch[1]) : '';

    // Skip tiny images, icons, tracking pixels, and data URIs
    if (!src || src.startsWith('data:')) continue;

    // Skip common non-content images
    if (
      src.includes('icon') ||
      src.includes('logo') ||
      src.includes('avatar') ||
      src.includes('sprite') ||
      src.includes('tracking') ||
      src.includes('pixel') ||
      src.includes('badge') ||
      src.includes('button') ||
      src.includes('1x1') ||
      src.includes('spacer')
    ) continue;

    const imgUrl = resolveUrl(src, baseUrl);
    if (imgUrl && !seen.has(imgUrl)) {
      seen.add(imgUrl);
      images.push({ url: imgUrl, alt });
    }

    // Limit to 8 images
    if (images.length >= 8) break;
  }

  return images;
}

function resolveUrl(src: string, baseUrl: URL): string | null {
  try {
    if (src.startsWith('//')) {
      return `https:${src}`;
    }
    if (src.startsWith('http')) {
      return src;
    }
    // Relative URL
    return new URL(src, baseUrl.origin).toString();
  } catch {
    return null;
  }
}

async function fetchImagesAsBase64(images: ExtractedImage[], baseUrl: URL): Promise<ExtractedImage[]> {
  const results: ExtractedImage[] = [];

  // Fetch images in parallel with timeout
  const fetchPromises = images.slice(0, 5).map(async (img) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(img.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': baseUrl.toString(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';

      // Only process actual images
      if (!contentType.startsWith('image/')) return null;

      // Skip SVG (not supported by Claude vision)
      if (contentType.includes('svg')) return null;

      const buffer = await response.arrayBuffer();

      // Skip tiny images (likely icons/pixels) - less than 2KB
      if (buffer.byteLength < 2000) return null;

      // Skip very large images - more than 4MB
      if (buffer.byteLength > 4 * 1024 * 1024) return null;

      const base64 = Buffer.from(buffer).toString('base64');

      // Map content type to Claude-supported types
      let mediaType = contentType.split(';')[0].trim();
      if (mediaType === 'image/jpg') mediaType = 'image/jpeg';

      // Only support these types for Claude
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!supportedTypes.includes(mediaType)) return null;

      return {
        ...img,
        base64,
        mediaType,
      };
    } catch (error) {
      console.error(`Failed to fetch image ${img.url}:`, error);
      return null;
    }
  });

  const fetched = await Promise.all(fetchPromises);

  for (const img of fetched) {
    if (img) {
      results.push(img);
    }
  }

  return results;
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
}

function extractMetaDescription(html: string): string {
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  return descMatch ? decodeHtmlEntities(descMatch[1].trim()) : '';
}

function extractOpenGraph(html: string): { title?: string; description?: string; siteName?: string; image?: string } {
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

  return {
    title: ogTitle ? decodeHtmlEntities(ogTitle[1]) : undefined,
    description: ogDesc ? decodeHtmlEntities(ogDesc[1]) : undefined,
    siteName: ogSite ? decodeHtmlEntities(ogSite[1]) : undefined,
    image: ogImage ? ogImage[1] : undefined,
  };
}

function extractMainContent(html: string): string {
  // Try to find main content areas
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class=["'][^"']*(?:content|article|post|entry|story|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id=["'][^"']*(?:content|article|post|entry|story|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of mainPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      // Get the largest match (likely main content)
      const largest = matches.reduce((a, b) => a.length > b.length ? a : b);
      const cleaned = cleanHtmlToText(largest);
      if (cleaned.length > 200) {
        return cleaned;
      }
    }
  }

  return '';
}

function extractArticles(html: string): Array<{ title: string; content: string }> {
  const articles: Array<{ title: string; content: string }> = [];

  // Extract sections with headings
  const sectionPattern = /<(?:section|div)[^>]*>([\s\S]*?)<\/(?:section|div)>/gi;
  let match;

  while ((match = sectionPattern.exec(html)) !== null) {
    const section = match[1];
    const headingMatch = section.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);

    if (headingMatch) {
      const title = cleanHtmlToText(headingMatch[1]).trim();
      const content = cleanHtmlToText(section);

      if (title && content.length > 100) {
        articles.push({ title, content });
      }
    }

    // Limit to 10 articles
    if (articles.length >= 10) break;
  }

  return articles;
}

function cleanHtmlToText(html: string): string {
  // Remove scripts, styles, and non-content elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert elements to text
  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n#### $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2')
    .replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  return text;
}

function extractTextFromHtml(html: string): string {
  // Fallback: extract all text
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n#### $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ');

  text = decodeHtmlEntities(text);

  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return text;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
