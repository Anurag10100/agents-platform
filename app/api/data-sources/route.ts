// Data Sources API - Fetch data from configured sources
import { NextRequest, NextResponse } from 'next/server';
import {
  DataSource,
  RSSDataSource,
  GoogleSheetsDataSource,
  AirtableDataSource,
  PREDEFINED_RSS_FEEDS,
} from '@/lib/data-sources/types';
import { fetchRSSFeed, fetchMultipleRSSFeeds } from '@/lib/data-sources/rss-fetcher';
import { fetchFromGoogleSheets, fetchFromGoogleSheetsAPI, extractSpreadsheetId } from '@/lib/data-sources/sheets-connector';
import { fetchFromAirtable } from '@/lib/data-sources/airtable-connector';
import { fetchFromSupabase } from '@/lib/data-sources/database-connector';
import { fetchDataSource, fetchMultipleDataSources, dataResultsToMarkdown } from '@/lib/data-sources';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sources, source, options } = body;

    switch (action) {
      case 'fetch': {
        // Fetch from a single data source
        if (!source) {
          return NextResponse.json(
            { success: false, error: 'Source configuration is required' },
            { status: 400 }
          );
        }

        const result = await fetchDataSource(source as DataSource);
        return NextResponse.json({
          success: result.success,
          data: result,
          error: result.error,
        });
      }

      case 'fetch-multiple': {
        // Fetch from multiple data sources in parallel
        if (!sources || !Array.isArray(sources)) {
          return NextResponse.json(
            { success: false, error: 'Sources array is required' },
            { status: 400 }
          );
        }

        const results = await fetchMultipleDataSources(sources as DataSource[]);
        const markdown = options?.asMarkdown ? dataResultsToMarkdown(results) : undefined;

        return NextResponse.json({
          success: true,
          data: results,
          markdown,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            totalItems: results.reduce((sum, r) => sum + (r.metadata?.totalItems || 0), 0),
          },
        });
      }

      case 'fetch-rss': {
        // Quick fetch from RSS feed URL
        const { url, name, maxItems, categories } = body;

        if (!url) {
          return NextResponse.json(
            { success: false, error: 'RSS feed URL is required' },
            { status: 400 }
          );
        }

        const result = await fetchRSSFeed(
          'quick-rss',
          name || 'RSS Feed',
          {
            url,
            maxItems: maxItems || 10,
            categories,
            includeFullContent: false,
          }
        );

        return NextResponse.json({
          success: result.success,
          data: result,
          error: result.error,
        });
      }

      case 'fetch-predefined-rss': {
        // Fetch from predefined RSS feeds by category
        const { feedIds, category, maxItems } = body;

        let feedsToFetch = PREDEFINED_RSS_FEEDS;

        if (feedIds && Array.isArray(feedIds)) {
          feedsToFetch = PREDEFINED_RSS_FEEDS.filter(f => feedIds.includes(f.id));
        } else if (category) {
          feedsToFetch = PREDEFINED_RSS_FEEDS.filter(f =>
            f.category.toLowerCase() === category.toLowerCase()
          );
        }

        if (feedsToFetch.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No matching feeds found' },
            { status: 400 }
          );
        }

        const feedConfigs = feedsToFetch.map(f => ({
          id: f.id,
          name: f.name,
          config: {
            url: f.url,
            maxItems: maxItems || 5,
            includeFullContent: false,
          },
        }));

        const results = await fetchMultipleRSSFeeds(feedConfigs);
        const markdown = options?.asMarkdown ? dataResultsToMarkdown(results) : undefined;

        return NextResponse.json({
          success: true,
          data: results,
          markdown,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            totalItems: results.reduce((sum, r) => sum + (r.metadata?.totalItems || 0), 0),
          },
        });
      }

      case 'fetch-sheets': {
        // Fetch from Google Sheets
        const { spreadsheetId, spreadsheetUrl, sheetName, range, apiKey, name } = body;

        const resolvedId = spreadsheetId || (spreadsheetUrl ? extractSpreadsheetId(spreadsheetUrl) : null);

        if (!resolvedId) {
          return NextResponse.json(
            { success: false, error: 'Spreadsheet ID or URL is required' },
            { status: 400 }
          );
        }

        const config = {
          spreadsheetId: resolvedId,
          sheetName,
          range,
          apiKey,
          headerRow: true,
        };

        const result = apiKey
          ? await fetchFromGoogleSheetsAPI('sheets', name || 'Google Sheet', config)
          : await fetchFromGoogleSheets('sheets', name || 'Google Sheet', config);

        return NextResponse.json({
          success: result.success,
          data: result,
          error: result.error,
        });
      }

      case 'fetch-airtable': {
        // Fetch from Airtable
        const { baseId, tableName, view, apiKey, maxRecords, filterByFormula, name } = body;

        if (!baseId || !tableName || !apiKey) {
          return NextResponse.json(
            { success: false, error: 'Base ID, Table Name, and API Key are required' },
            { status: 400 }
          );
        }

        const result = await fetchFromAirtable('airtable', name || tableName, {
          baseId,
          tableName,
          view,
          apiKey,
          maxRecords: maxRecords || 100,
          filterByFormula,
        });

        return NextResponse.json({
          success: result.success,
          data: result,
          error: result.error,
        });
      }

      case 'fetch-database': {
        // Fetch from Supabase/database
        const { supabaseUrl, supabaseKey, table, query, name } = body;

        if (!supabaseUrl || !supabaseKey) {
          return NextResponse.json(
            { success: false, error: 'Supabase URL and Key are required' },
            { status: 400 }
          );
        }

        if (!table && !query) {
          return NextResponse.json(
            { success: false, error: 'Table name or query is required' },
            { status: 400 }
          );
        }

        const result = await fetchFromSupabase('database', name || table || 'Database', {
          connectionType: 'supabase',
          supabaseUrl,
          supabaseKey,
          table,
          query,
        });

        return NextResponse.json({
          success: result.success,
          data: result,
          error: result.error,
        });
      }

      case 'list-predefined-feeds': {
        // Return list of predefined RSS feeds
        return NextResponse.json({
          success: true,
          data: PREDEFINED_RSS_FEEDS,
          categories: [...new Set(PREDEFINED_RSS_FEEDS.map(f => f.category))],
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Data sources API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: `Data sources error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET endpoint for listing predefined feeds
export async function GET() {
  return NextResponse.json({
    success: true,
    predefinedFeeds: PREDEFINED_RSS_FEEDS,
    categories: [...new Set(PREDEFINED_RSS_FEEDS.map(f => f.category))],
    supportedTypes: ['rss', 'google_sheets', 'airtable', 'database'],
  });
}
