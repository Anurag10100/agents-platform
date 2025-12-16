// Data Sources Module - Main Entry Point
// Unified interface for fetching data from multiple sources

export * from './types';
export * from './rss-fetcher';
export * from './database-connector';
export * from './sheets-connector';
export * from './airtable-connector';

import {
  DataSource,
  DataFetchResult,
  RSSDataSource,
  DatabaseDataSource,
  GoogleSheetsDataSource,
  AirtableDataSource,
  PREDEFINED_RSS_FEEDS,
} from './types';
import { fetchRSSFeed, rssItemsToMarkdown, RSSItem } from './rss-fetcher';
import { fetchFromSupabase, databaseRecordsToMarkdown, DatabaseRecord } from './database-connector';
import { fetchFromGoogleSheets, fetchFromGoogleSheetsAPI, sheetRowsToMarkdown, SheetRow } from './sheets-connector';
import { fetchFromAirtable, airtableRecordsToMarkdown, AirtableRecord } from './airtable-connector';

// Unified fetch function that routes to the appropriate connector
export async function fetchDataSource(source: DataSource): Promise<DataFetchResult> {
  switch (source.type) {
    case 'rss':
      return fetchRSSFeed(source.id, source.name, source.config);

    case 'database':
      return fetchFromSupabase(source.id, source.name, source.config);

    case 'google_sheets':
      // Try API method if key is provided, otherwise use public CSV export
      if (source.config.apiKey) {
        return fetchFromGoogleSheetsAPI(source.id, source.name, source.config);
      }
      return fetchFromGoogleSheets(source.id, source.name, source.config);

    case 'airtable':
      return fetchFromAirtable(source.id, source.name, source.config);

    default:
      return {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        fetchedAt: new Date().toISOString(),
        success: false,
        error: `Unsupported data source type: ${source.type}`,
        data: [],
      };
  }
}

// Fetch multiple data sources in parallel
export async function fetchMultipleDataSources(
  sources: DataSource[]
): Promise<DataFetchResult[]> {
  const enabledSources = sources.filter(s => s.enabled);

  const results = await Promise.allSettled(
    enabledSources.map(source => fetchDataSource(source))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      sourceId: enabledSources[index].id,
      sourceName: enabledSources[index].name,
      sourceType: enabledSources[index].type,
      fetchedAt: new Date().toISOString(),
      success: false,
      error: result.reason?.message || 'Unknown error',
      data: [],
    };
  });
}

// Convert fetch results to markdown context for AI
export function dataResultsToMarkdown(results: DataFetchResult[]): string {
  const sections: string[] = [];

  for (const result of results) {
    if (!result.success || result.data.length === 0) {
      continue;
    }

    let markdown = '';

    switch (result.sourceType) {
      case 'rss':
        markdown = rssItemsToMarkdown(result.data as RSSItem[], result.sourceName);
        break;

      case 'database':
        markdown = databaseRecordsToMarkdown(
          result.data as DatabaseRecord[],
          result.sourceName,
          'Records'
        );
        break;

      case 'google_sheets':
        markdown = sheetRowsToMarkdown(result.data as SheetRow[], result.sourceName);
        break;

      case 'airtable':
        markdown = airtableRecordsToMarkdown(result.data as AirtableRecord[], result.sourceName);
        break;
    }

    if (markdown) {
      sections.push(markdown);
    }
  }

  if (sections.length === 0) {
    return '';
  }

  return [
    '# Real-Time Data Context',
    '',
    'The following data was fetched in real-time from connected data sources:',
    '',
    ...sections,
  ].join('\n');
}

// Create quick RSS sources from predefined feeds
export function createPredefinedRSSSource(feedId: string): RSSDataSource | null {
  const feed = PREDEFINED_RSS_FEEDS.find(f => f.id === feedId);
  if (!feed) return null;

  return {
    id: feed.id,
    name: feed.name,
    type: 'rss',
    enabled: true,
    config: {
      url: feed.url,
      maxItems: 10,
      includeFullContent: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Data source configuration storage (localStorage for single-user mode)
const DATA_SOURCES_STORAGE_KEY = 'newsletter_data_sources';

export function saveDataSources(sources: DataSource[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DATA_SOURCES_STORAGE_KEY, JSON.stringify(sources));
  }
}

export function loadDataSources(): DataSource[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(DATA_SOURCES_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
  }
  return [];
}

export function addDataSource(source: DataSource): DataSource[] {
  const sources = loadDataSources();
  const existing = sources.findIndex(s => s.id === source.id);

  if (existing >= 0) {
    sources[existing] = source;
  } else {
    sources.push(source);
  }

  saveDataSources(sources);
  return sources;
}

export function removeDataSource(sourceId: string): DataSource[] {
  const sources = loadDataSources().filter(s => s.id !== sourceId);
  saveDataSources(sources);
  return sources;
}

export function toggleDataSource(sourceId: string, enabled: boolean): DataSource[] {
  const sources = loadDataSources();
  const source = sources.find(s => s.id === sourceId);

  if (source) {
    source.enabled = enabled;
    source.updatedAt = new Date().toISOString();
    saveDataSources(sources);
  }

  return sources;
}

// Get data sources filtered by skill relevance
export function getDataSourcesForSkill(skillId: string): DataSource[] {
  const sources = loadDataSources();
  // For now, return all enabled sources
  // In the future, this could filter based on SKILL_DATA_SOURCE_MAPPING
  return sources.filter(s => s.enabled);
}
