// Database Connector for CRM/Event Data Integration
// Supports Supabase (primary), with extensibility for other databases
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseConfig, DatabaseRecord, DataFetchResult } from './types';

// Cache for Supabase clients
const clientCache: Map<string, SupabaseClient> = new Map();

function getSupabaseClient(url: string, key: string): SupabaseClient {
  const cacheKey = `${url}:${key.substring(0, 10)}`;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = createClient(url, key);
  clientCache.set(cacheKey, client);
  return client;
}

// Query configuration for common CRM data types
export interface CRMQueryConfig {
  type: 'speakers' | 'events' | 'subscribers' | 'sponsors' | 'custom';
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

// Predefined queries for common CRM data
const CRM_QUERY_TEMPLATES: Record<string, { table: string; select: string; orderBy?: string }> = {
  speakers: {
    table: 'speakers',
    select: 'id, name, title, company, bio, photo_url, linkedin_url, topics, is_confirmed',
    orderBy: 'name',
  },
  events: {
    table: 'events',
    select: 'id, name, description, start_date, end_date, location, venue, status, expected_attendance, themes',
    orderBy: 'start_date',
  },
  subscribers: {
    table: 'subscribers',
    select: 'id, email, name, company, industry, subscription_type, subscribed_at, is_active',
    orderBy: 'subscribed_at',
  },
  sponsors: {
    table: 'sponsors',
    select: 'id, name, tier, logo_url, website, contact_name, contact_email, is_active',
    orderBy: 'tier',
  },
};

export async function fetchFromSupabase(
  sourceId: string,
  sourceName: string,
  config: DatabaseConfig,
  queryConfig?: CRMQueryConfig
): Promise<DataFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    // Validate Supabase configuration
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and Key are required');
    }

    const client = getSupabaseClient(config.supabaseUrl, config.supabaseKey);

    let query;

    if (queryConfig && queryConfig.type !== 'custom') {
      // Use predefined query template
      const template = CRM_QUERY_TEMPLATES[queryConfig.type];
      if (!template) {
        throw new Error(`Unknown CRM query type: ${queryConfig.type}`);
      }

      query = client
        .from(config.table || template.table)
        .select(queryConfig.select || template.select);

      // Apply filters
      if (queryConfig.filters) {
        for (const [key, value] of Object.entries(queryConfig.filters)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }

      // Apply ordering
      if (queryConfig.orderBy) {
        query = query.order(queryConfig.orderBy.column, {
          ascending: queryConfig.orderBy.ascending ?? true
        });
      } else if (template.orderBy) {
        query = query.order(template.orderBy);
      }

      // Apply limit
      if (queryConfig.limit) {
        query = query.limit(queryConfig.limit);
      }
    } else if (config.query) {
      // Use custom RPC call if query is provided (for complex queries)
      // Note: This requires the query to be set up as a Supabase function
      const { data, error } = await client.rpc(config.query);

      if (error) throw error;

      return {
        sourceId,
        sourceName,
        sourceType: 'database',
        fetchedAt,
        success: true,
        data: data || [],
        metadata: {
          totalItems: (data || []).length,
        },
      };
    } else if (config.table) {
      // Simple table query
      query = client.from(config.table).select('*');
    } else {
      throw new Error('Either table name or query function must be specified');
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'database',
      fetchedAt,
      success: true,
      data: (data || []) as DatabaseRecord[],
      metadata: {
        totalItems: (data || []).length,
        originalCount: count || undefined,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

    return {
      sourceId,
      sourceName,
      sourceType: 'database',
      fetchedAt,
      success: false,
      error: `Database query failed: ${errorMessage}`,
      data: [],
    };
  }
}

// Fetch speaker data for speaker mailer
export async function fetchSpeakers(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    eventId?: string;
    confirmed?: boolean;
    topics?: string[];
    limit?: number;
  }
): Promise<DataFetchResult> {
  const config: DatabaseConfig = {
    connectionType: 'supabase',
    supabaseUrl,
    supabaseKey,
    table: 'speakers',
  };

  const filters: Record<string, unknown> = {};
  if (options?.eventId) filters.event_id = options.eventId;
  if (options?.confirmed !== undefined) filters.is_confirmed = options.confirmed;

  return fetchFromSupabase('speakers', 'Speaker Database', config, {
    type: 'speakers',
    filters,
    limit: options?.limit || 50,
  });
}

// Fetch event data
export async function fetchEvents(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    upcoming?: boolean;
    status?: 'draft' | 'published' | 'completed';
    limit?: number;
  }
): Promise<DataFetchResult> {
  const config: DatabaseConfig = {
    connectionType: 'supabase',
    supabaseUrl,
    supabaseKey,
    table: 'events',
  };

  const filters: Record<string, unknown> = {};
  if (options?.status) filters.status = options.status;

  // Note: For upcoming events, you'd need a custom RPC or filter
  // This is a simplified version

  return fetchFromSupabase('events', 'Event Database', config, {
    type: 'events',
    filters,
    limit: options?.limit || 20,
    orderBy: { column: 'start_date', ascending: true },
  });
}

// Fetch subscriber data
export async function fetchSubscribers(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    industry?: string;
    subscriptionType?: string;
    activeOnly?: boolean;
    limit?: number;
  }
): Promise<DataFetchResult> {
  const config: DatabaseConfig = {
    connectionType: 'supabase',
    supabaseUrl,
    supabaseKey,
    table: 'subscribers',
  };

  const filters: Record<string, unknown> = {};
  if (options?.industry) filters.industry = options.industry;
  if (options?.subscriptionType) filters.subscription_type = options.subscriptionType;
  if (options?.activeOnly) filters.is_active = true;

  return fetchFromSupabase('subscribers', 'Subscriber Database', config, {
    type: 'subscribers',
    filters,
    limit: options?.limit || 100,
  });
}

// Convert database records to markdown for AI context
export function databaseRecordsToMarkdown(
  records: DatabaseRecord[],
  sourceName: string,
  dataType: string
): string {
  if (records.length === 0) return '';

  const lines: string[] = [
    `## ${dataType} from ${sourceName}`,
    `*Total: ${records.length} records*`,
    '',
  ];

  // Format based on data type
  switch (dataType.toLowerCase()) {
    case 'speakers':
      records.forEach((record, index) => {
        lines.push(`### ${index + 1}. ${record.name || 'Unknown Speaker'}`);
        if (record.title) lines.push(`**Title:** ${record.title}`);
        if (record.company) lines.push(`**Company:** ${record.company}`);
        if (record.bio) lines.push(`**Bio:** ${String(record.bio).substring(0, 200)}...`);
        if (record.topics) lines.push(`**Topics:** ${Array.isArray(record.topics) ? record.topics.join(', ') : record.topics}`);
        lines.push('');
      });
      break;

    case 'events':
      records.forEach((record, index) => {
        lines.push(`### ${index + 1}. ${record.name || 'Unnamed Event'}`);
        if (record.start_date) lines.push(`**Date:** ${record.start_date}${record.end_date ? ` - ${record.end_date}` : ''}`);
        if (record.location) lines.push(`**Location:** ${record.location}`);
        if (record.venue) lines.push(`**Venue:** ${record.venue}`);
        if (record.description) lines.push(`**Description:** ${String(record.description).substring(0, 300)}...`);
        if (record.themes) lines.push(`**Themes:** ${Array.isArray(record.themes) ? record.themes.join(', ') : record.themes}`);
        lines.push('');
      });
      break;

    case 'subscribers':
      lines.push('| Name | Email | Company | Industry |');
      lines.push('|------|-------|---------|----------|');
      records.slice(0, 20).forEach(record => {
        lines.push(`| ${record.name || '-'} | ${record.email || '-'} | ${record.company || '-'} | ${record.industry || '-'} |`);
      });
      if (records.length > 20) {
        lines.push(`*...and ${records.length - 20} more subscribers*`);
      }
      break;

    default:
      // Generic table format
      if (records.length > 0) {
        const keys = Object.keys(records[0]).filter(k => !k.startsWith('_'));
        lines.push('| ' + keys.join(' | ') + ' |');
        lines.push('|' + keys.map(() => '---').join('|') + '|');
        records.slice(0, 30).forEach(record => {
          lines.push('| ' + keys.map(k => String(record[k] || '-').substring(0, 50)).join(' | ') + ' |');
        });
        if (records.length > 30) {
          lines.push(`*...and ${records.length - 30} more records*`);
        }
      }
  }

  return lines.join('\n');
}

// CRM data schema suggestions for Supabase setup
export const CRM_SCHEMA_SUGGESTIONS = `
-- Suggested CRM tables for Supabase integration

-- Speakers table
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  bio TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  topics TEXT[],
  is_confirmed BOOLEAN DEFAULT false,
  event_id UUID REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  venue TEXT,
  status TEXT DEFAULT 'draft',
  expected_attendance INTEGER,
  themes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  industry TEXT,
  subscription_type TEXT DEFAULT 'newsletter',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Sponsors table
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tier TEXT,
  logo_url TEXT,
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  event_id UUID REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;
