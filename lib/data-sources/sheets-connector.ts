// Google Sheets Connector for Data Integration
import { GoogleSheetsConfig, SheetRow, DataFetchResult } from './types';

// Parse CSV response from Google Sheets
function parseCSV(csv: string): SheetRow[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: SheetRow = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Try to parse as number or boolean
      if (value === 'TRUE' || value === 'true') {
        row[header] = true;
      } else if (value === 'FALSE' || value === 'false') {
        row[header] = false;
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
        row[header] = Number(value);
      } else {
        row[header] = value;
      }
    });

    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

// Fetch data from Google Sheets using public CSV export
// This works for sheets that are published to the web or shared with "Anyone with the link"
export async function fetchFromGoogleSheets(
  sourceId: string,
  sourceName: string,
  config: GoogleSheetsConfig
): Promise<DataFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    // Validate configuration
    if (!config.spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Build the export URL
    // Format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/export?format=csv&gid={sheetId}
    let url = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/export?format=csv`;

    // Add sheet name/gid if specified
    if (config.sheetName) {
      // For named sheets, we need to use gid or sheet name
      // If it's a number, use it as gid
      if (/^\d+$/.test(config.sheetName)) {
        url += `&gid=${config.sheetName}`;
      } else {
        // For named sheets in newer format
        url += `&sheet=${encodeURIComponent(config.sheetName)}`;
      }
    }

    // Add range if specified (only for specific cells)
    if (config.range) {
      url += `&range=${encodeURIComponent(config.range)}`;
    }

    // Fetch the CSV data
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Spreadsheet not found. Make sure it exists and is shared publicly.');
      }
      if (response.status === 403) {
        throw new Error('Access denied. Make sure the spreadsheet is shared with "Anyone with the link" can view.');
      }
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const csv = await response.text();

    if (!csv || csv.trim().length === 0) {
      throw new Error('Empty spreadsheet or no data found');
    }

    // Check if we got HTML instead of CSV (sign of auth issues)
    if (csv.includes('<!DOCTYPE html>') || csv.includes('<html')) {
      throw new Error('Authentication required. Make sure the spreadsheet is published to the web or shared publicly.');
    }

    // Parse CSV to rows
    const rows = parseCSV(csv);

    if (rows.length === 0) {
      throw new Error('No data rows found in spreadsheet');
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'google_sheets',
      fetchedAt,
      success: true,
      data: rows,
      metadata: {
        totalItems: rows.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('abort')) {
      return {
        sourceId,
        sourceName,
        sourceType: 'google_sheets',
        fetchedAt,
        success: false,
        error: 'Request timed out after 20 seconds',
        data: [],
      };
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'google_sheets',
      fetchedAt,
      success: false,
      error: `Failed to fetch Google Sheet: ${errorMessage}`,
      data: [],
    };
  }
}

// Alternative: Fetch using Google Sheets API v4 (requires API key)
export async function fetchFromGoogleSheetsAPI(
  sourceId: string,
  sourceName: string,
  config: GoogleSheetsConfig
): Promise<DataFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    if (!config.spreadsheetId || !config.apiKey) {
      throw new Error('Spreadsheet ID and API Key are required');
    }

    const range = config.range || (config.sheetName ? `${config.sheetName}!A:Z` : 'Sheet1!A:Z');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?key=${config.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      throw new Error('No data found in the specified range');
    }

    // First row is headers (if headerRow is true, default)
    const hasHeaders = config.headerRow !== false;
    const headers = hasHeaders ? data.values[0] : data.values[0].map((_: unknown, i: number) => `Column${i + 1}`);
    const dataRows = hasHeaders ? data.values.slice(1) : data.values;

    const rows: SheetRow[] = dataRows.map((row: unknown[]) => {
      const obj: SheetRow = {};
      headers.forEach((header: string, index: number) => {
        const value = row[index];
        if (value === undefined || value === null) {
          obj[header] = null;
        } else if (typeof value === 'boolean') {
          obj[header] = value;
        } else if (typeof value === 'number') {
          obj[header] = value;
        } else {
          obj[header] = String(value);
        }
      });
      return obj;
    });

    return {
      sourceId,
      sourceName,
      sourceType: 'google_sheets',
      fetchedAt,
      success: true,
      data: rows,
      metadata: {
        totalItems: rows.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      sourceId,
      sourceName,
      sourceType: 'google_sheets',
      fetchedAt,
      success: false,
      error: `Failed to fetch via Sheets API: ${errorMessage}`,
      data: [],
    };
  }
}

// Convert sheet rows to markdown for AI context
export function sheetRowsToMarkdown(rows: SheetRow[], sheetName: string): string {
  if (rows.length === 0) return '';

  const lines: string[] = [
    `## Data from Google Sheet: ${sheetName}`,
    `*Total: ${rows.length} rows*`,
    '',
  ];

  // Get all unique keys
  const allKeys = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
  const keys = Array.from(allKeys);

  if (keys.length === 0) return '';

  // Create markdown table
  lines.push('| ' + keys.join(' | ') + ' |');
  lines.push('|' + keys.map(() => '---').join('|') + '|');

  // Limit to 50 rows for context size
  const displayRows = rows.slice(0, 50);
  displayRows.forEach(row => {
    const values = keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '-';
      const str = String(val);
      // Truncate long values and escape pipes
      return str.substring(0, 100).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    });
    lines.push('| ' + values.join(' | ') + ' |');
  });

  if (rows.length > 50) {
    lines.push('');
    lines.push(`*...and ${rows.length - 50} more rows*`);
  }

  return lines.join('\n');
}

// Extract spreadsheet ID from various URL formats
export function extractSpreadsheetId(urlOrId: string): string | null {
  // If it's already just an ID (no slashes)
  if (!urlOrId.includes('/')) {
    return urlOrId;
  }

  // Match various Google Sheets URL formats
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/,
    /key=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
