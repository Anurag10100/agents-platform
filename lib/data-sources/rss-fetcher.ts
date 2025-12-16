// RSS Feed Fetcher for Live News Integration
import { RSSFeedConfig, RSSItem, DataFetchResult } from './types';

interface ParsedFeed {
  title?: string;
  description?: string;
  items: RSSItem[];
}

// Parse RSS/Atom XML to extract items
function parseRSSXML(xml: string): ParsedFeed {
  const items: RSSItem[] = [];

  // Try RSS 2.0 format first
  const rssItemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let matches = xml.matchAll(rssItemRegex);

  for (const match of matches) {
    const itemXml = match[1];
    const item = parseRSSItem(itemXml);
    if (item.title || item.link) {
      items.push(item);
    }
  }

  // If no RSS items, try Atom format
  if (items.length === 0) {
    const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    matches = xml.matchAll(atomEntryRegex);

    for (const match of matches) {
      const entryXml = match[1];
      const item = parseAtomEntry(entryXml);
      if (item.title || item.link) {
        items.push(item);
      }
    }
  }

  // Extract feed metadata
  const titleMatch = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const descMatch = xml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

  return {
    title: titleMatch ? cleanText(titleMatch[1]) : undefined,
    description: descMatch ? cleanText(descMatch[1]) : undefined,
    items,
  };
}

function parseRSSItem(xml: string): RSSItem {
  const getTagContent = (tag: string): string | undefined => {
    // Handle CDATA sections
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle regular content
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? cleanText(match[1]) : undefined;
  };

  const getAttrContent = (tag: string, attr: string): string | undefined => {
    const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : undefined;
  };

  // Extract categories
  const categories: string[] = [];
  const categoryMatches = xml.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi);
  for (const match of categoryMatches) {
    const cat = cleanText(match[1]);
    if (cat) categories.push(cat);
  }

  // Extract image URL from various sources
  let imageUrl = getAttrContent('media:content', 'url') ||
                 getAttrContent('media:thumbnail', 'url') ||
                 getAttrContent('enclosure', 'url') ||
                 getTagContent('image');

  // Check for image in content
  if (!imageUrl) {
    const content = getTagContent('content:encoded') || getTagContent('description');
    if (content) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }
  }

  return {
    title: getTagContent('title') || '',
    link: getTagContent('link') || '',
    description: getTagContent('description'),
    content: getTagContent('content:encoded') || getTagContent('content'),
    pubDate: getTagContent('pubDate') || getTagContent('dc:date'),
    author: getTagContent('author') || getTagContent('dc:creator'),
    categories: categories.length > 0 ? categories : undefined,
    imageUrl,
  };
}

function parseAtomEntry(xml: string): RSSItem {
  const getTagContent = (tag: string): string | undefined => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? cleanText(match[1]) : undefined;
  };

  const getAttrContent = (tag: string, attr: string): string | undefined => {
    const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : undefined;
  };

  // Atom uses href attribute for links
  const linkHref = getAttrContent('link', 'href');

  // Extract categories
  const categories: string[] = [];
  const categoryMatches = xml.matchAll(/<category[^>]*term=["']([^"']+)["']/gi);
  for (const match of categoryMatches) {
    categories.push(match[1]);
  }

  return {
    title: getTagContent('title') || '',
    link: linkHref || getTagContent('link') || '',
    description: getTagContent('summary'),
    content: getTagContent('content'),
    pubDate: getTagContent('published') || getTagContent('updated'),
    author: getTagContent('name') || getTagContent('author'),
    categories: categories.length > 0 ? categories : undefined,
    imageUrl: getAttrContent('media:content', 'url') || getAttrContent('media:thumbnail', 'url'),
  };
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchRSSFeed(
  sourceId: string,
  sourceName: string,
  config: RSSFeedConfig
): Promise<DataFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    // Fetch the RSS feed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(config.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    if (!xml || xml.trim().length === 0) {
      throw new Error('Empty response from feed');
    }

    // Parse the feed
    const parsed = parseRSSXML(xml);

    if (parsed.items.length === 0) {
      throw new Error('No items found in feed');
    }

    // Filter by categories if specified
    let items = parsed.items;
    if (config.categories && config.categories.length > 0) {
      const lowerCategories = config.categories.map(c => c.toLowerCase());
      items = items.filter(item => {
        if (!item.categories) return false;
        return item.categories.some(cat =>
          lowerCategories.includes(cat.toLowerCase())
        );
      });
    }

    // Limit items
    const maxItems = config.maxItems || 10;
    const originalCount = items.length;
    const truncated = items.length > maxItems;
    items = items.slice(0, maxItems);

    // If not including full content, truncate descriptions
    if (!config.includeFullContent) {
      items = items.map(item => ({
        ...item,
        content: undefined, // Remove full content
        description: item.description
          ? item.description.substring(0, 500) + (item.description.length > 500 ? '...' : '')
          : undefined,
      }));
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'rss',
      fetchedAt,
      success: true,
      data: items,
      metadata: {
        totalItems: items.length,
        truncated,
        originalCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error types
    if (errorMessage.includes('abort')) {
      return {
        sourceId,
        sourceName,
        sourceType: 'rss',
        fetchedAt,
        success: false,
        error: 'Request timed out after 15 seconds',
        data: [],
      };
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'rss',
      fetchedAt,
      success: false,
      error: `Failed to fetch RSS feed: ${errorMessage}`,
      data: [],
    };
  }
}

// Fetch multiple RSS feeds in parallel
export async function fetchMultipleRSSFeeds(
  feeds: Array<{ id: string; name: string; config: RSSFeedConfig }>
): Promise<DataFetchResult[]> {
  const results = await Promise.allSettled(
    feeds.map(feed => fetchRSSFeed(feed.id, feed.name, feed.config))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      sourceId: feeds[index].id,
      sourceName: feeds[index].name,
      sourceType: 'rss' as const,
      fetchedAt: new Date().toISOString(),
      success: false,
      error: result.reason?.message || 'Unknown error',
      data: [],
    };
  });
}

// Convert RSS items to formatted markdown for AI context
export function rssItemsToMarkdown(items: RSSItem[], feedName: string): string {
  if (items.length === 0) return '';

  const lines: string[] = [
    `## News from ${feedName}`,
    `*Fetched at: ${new Date().toLocaleString()}*`,
    '',
  ];

  items.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title}`);
    if (item.pubDate) {
      const date = new Date(item.pubDate);
      lines.push(`*Published: ${date.toLocaleDateString()}*`);
    }
    if (item.author) {
      lines.push(`*By: ${item.author}*`);
    }
    if (item.categories && item.categories.length > 0) {
      lines.push(`*Categories: ${item.categories.join(', ')}*`);
    }
    lines.push('');
    if (item.description) {
      lines.push(item.description);
    }
    if (item.content) {
      lines.push('');
      lines.push('**Full Content:**');
      lines.push(item.content);
    }
    if (item.link) {
      lines.push('');
      lines.push(`[Read more](${item.link})`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}
