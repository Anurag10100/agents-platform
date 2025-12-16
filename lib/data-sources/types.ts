// Data Sources Types for Real-Time Integration
// Supports RSS feeds, database connections, Google Sheets, and Airtable

export type DataSourceType = 'rss' | 'database' | 'google_sheets' | 'airtable' | 'api';

export interface DataSourceBase {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;
  lastFetched?: string;
  refreshInterval?: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

// RSS Feed Configuration
export interface RSSFeedConfig {
  url: string;
  maxItems?: number;
  categories?: string[];
  includeFullContent?: boolean;
}

export interface RSSDataSource extends DataSourceBase {
  type: 'rss';
  config: RSSFeedConfig;
}

// Database Connection Configuration
export interface DatabaseConfig {
  connectionType: 'postgres' | 'mysql' | 'mongodb' | 'supabase';
  host?: string;
  port?: number;
  database?: string;
  table?: string;
  query?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface DatabaseDataSource extends DataSourceBase {
  type: 'database';
  config: DatabaseConfig;
}

// Google Sheets Configuration
export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
  headerRow?: boolean;
  apiKey?: string;
  // For OAuth-based access
  accessToken?: string;
  refreshToken?: string;
}

export interface GoogleSheetsDataSource extends DataSourceBase {
  type: 'google_sheets';
  config: GoogleSheetsConfig;
}

// Airtable Configuration
export interface AirtableConfig {
  baseId: string;
  tableName: string;
  view?: string;
  apiKey: string;
  maxRecords?: number;
  filterByFormula?: string;
}

export interface AirtableDataSource extends DataSourceBase {
  type: 'airtable';
  config: AirtableConfig;
}

// Generic API Configuration
export interface APIConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  responseMapping?: {
    dataPath: string; // JSONPath to data array
    fields: Record<string, string>; // field name -> JSONPath
  };
}

export interface APIDataSource extends DataSourceBase {
  type: 'api';
  config: APIConfig;
}

// Union type for all data sources
export type DataSource =
  | RSSDataSource
  | DatabaseDataSource
  | GoogleSheetsDataSource
  | AirtableDataSource
  | APIDataSource;

// Fetched data types
export interface RSSItem {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
  imageUrl?: string;
}

export interface DatabaseRecord {
  [key: string]: unknown;
}

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

// Unified data result
export interface DataFetchResult {
  sourceId: string;
  sourceName: string;
  sourceType: DataSourceType;
  fetchedAt: string;
  success: boolean;
  error?: string;
  data: RSSItem[] | DatabaseRecord[] | SheetRow[] | AirtableRecord[];
  metadata?: {
    totalItems: number;
    truncated?: boolean;
    originalCount?: number;
  };
}

// Predefined RSS feeds for common Indian news sources
export interface PredefinedRSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

export const PREDEFINED_RSS_FEEDS: PredefinedRSSFeed[] = [
  // Government & Policy
  {
    id: 'pib-india',
    name: 'PIB India',
    url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
    category: 'Government',
    description: 'Press Information Bureau - Official Government Updates',
  },
  {
    id: 'pib-features',
    name: 'PIB Features',
    url: 'https://pib.gov.in/RssMain.aspx?ModId=8&Lang=1&Regid=3',
    category: 'Government',
    description: 'PIB Feature Stories & Analysis',
  },
  // Economic Times
  {
    id: 'et-tech',
    name: 'Economic Times Tech',
    url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms',
    category: 'Technology',
    description: 'Latest Technology News from ET',
  },
  {
    id: 'et-economy',
    name: 'Economic Times Economy',
    url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms',
    category: 'Economy',
    description: 'Economic & Policy News from ET',
  },
  {
    id: 'et-fintech',
    name: 'ET Fintech',
    url: 'https://economictimes.indiatimes.com/tech/technology/rssfeeds/78570561.cms',
    category: 'FinTech',
    description: 'Fintech & Digital Banking News',
  },
  // Business Standard
  {
    id: 'bs-economy',
    name: 'Business Standard Economy',
    url: 'https://www.business-standard.com/rss/economy-policy-102.rss',
    category: 'Economy',
    description: 'Economy & Policy from Business Standard',
  },
  // NDTV
  {
    id: 'ndtv-india',
    name: 'NDTV India News',
    url: 'https://feeds.feedburner.com/ndtvnews-india-news',
    category: 'General',
    description: 'India News from NDTV',
  },
  // Mint
  {
    id: 'mint-technology',
    name: 'Mint Technology',
    url: 'https://www.livemint.com/rss/technology',
    category: 'Technology',
    description: 'Technology News from Mint',
  },
  // Healthcare
  {
    id: 'express-healthcare',
    name: 'Express Healthcare',
    url: 'https://www.expresshealthcare.in/feed/',
    category: 'Healthcare',
    description: 'Healthcare Industry News',
  },
  // Education
  {
    id: 'india-education-diary',
    name: 'India Education Diary',
    url: 'https://indiaeducationdiary.in/feed/',
    category: 'Education',
    description: 'Education Sector News & Updates',
  },
  // Smart Cities
  {
    id: 'smart-cities-world',
    name: 'Smart Cities World',
    url: 'https://www.smartcitiesworld.net/rss/news',
    category: 'Smart Cities',
    description: 'Global Smart Cities News',
  },
];

// Data source category mappings for skills
export const SKILL_DATA_SOURCE_MAPPING: Record<string, string[]> = {
  'editorial-newsletter': ['Government', 'Technology', 'Economy', 'General'],
  'research-agent': ['Government', 'Technology', 'Economy', 'FinTech', 'Healthcare', 'Education'],
  'speaker-mailer': ['Events', 'Database'],
  'daily-briefing': ['Government', 'Technology', 'Economy', 'FinTech', 'Healthcare', 'Education', 'Smart Cities'],
  'content-transformer': [],
  'presentation': ['Events', 'Database'],
};
