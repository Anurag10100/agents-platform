// Airtable Connector for Data Integration
import { AirtableConfig, AirtableRecord, DataFetchResult } from './types';

// Airtable API base URL
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export async function fetchFromAirtable(
  sourceId: string,
  sourceName: string,
  config: AirtableConfig
): Promise<DataFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    // Validate configuration
    if (!config.baseId || !config.tableName || !config.apiKey) {
      throw new Error('Base ID, Table Name, and API Key are required');
    }

    // Build the API URL
    let url = `${AIRTABLE_API_URL}/${config.baseId}/${encodeURIComponent(config.tableName)}`;

    // Build query parameters
    const params = new URLSearchParams();

    if (config.view) {
      params.append('view', config.view);
    }

    if (config.maxRecords) {
      params.append('maxRecords', String(config.maxRecords));
    }

    if (config.filterByFormula) {
      params.append('filterByFormula', config.filterByFormula);
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    // Fetch data with pagination support
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const fetchUrl = offset ? `${url}&offset=${offset}` : url;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Airtable API key.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Make sure your API key has access to this base.');
        }
        if (response.status === 404) {
          throw new Error('Base or table not found. Please check your Base ID and Table Name.');
        }

        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.records) {
        allRecords.push(...data.records);
      }

      offset = data.offset;

      // Limit total records to prevent excessive fetching
      if (allRecords.length >= (config.maxRecords || 1000)) {
        break;
      }
    } while (offset);

    return {
      sourceId,
      sourceName,
      sourceType: 'airtable',
      fetchedAt,
      success: true,
      data: allRecords,
      metadata: {
        totalItems: allRecords.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('abort')) {
      return {
        sourceId,
        sourceName,
        sourceType: 'airtable',
        fetchedAt,
        success: false,
        error: 'Request timed out after 15 seconds',
        data: [],
      };
    }

    return {
      sourceId,
      sourceName,
      sourceType: 'airtable',
      fetchedAt,
      success: false,
      error: `Failed to fetch from Airtable: ${errorMessage}`,
      data: [],
    };
  }
}

// Convert Airtable records to a simpler format
export function flattenAirtableRecords(records: AirtableRecord[]): Record<string, unknown>[] {
  return records.map(record => ({
    _id: record.id,
    _createdTime: record.createdTime,
    ...record.fields,
  }));
}

// Convert Airtable records to markdown for AI context
export function airtableRecordsToMarkdown(
  records: AirtableRecord[],
  tableName: string
): string {
  if (records.length === 0) return '';

  const lines: string[] = [
    `## Data from Airtable: ${tableName}`,
    `*Total: ${records.length} records*`,
    '',
  ];

  // Collect all unique field names
  const allFields = new Set<string>();
  records.forEach(record => {
    Object.keys(record.fields).forEach(field => allFields.add(field));
  });

  const fields = Array.from(allFields);

  if (fields.length === 0) {
    lines.push('*No fields found in records*');
    return lines.join('\n');
  }

  // If there are many fields, show as individual records
  if (fields.length > 8) {
    records.slice(0, 20).forEach((record, index) => {
      lines.push(`### Record ${index + 1}`);
      for (const [key, value] of Object.entries(record.fields)) {
        const displayValue = formatAirtableValue(value);
        lines.push(`- **${key}:** ${displayValue}`);
      }
      lines.push('');
    });

    if (records.length > 20) {
      lines.push(`*...and ${records.length - 20} more records*`);
    }
  } else {
    // Show as table
    lines.push('| ' + fields.join(' | ') + ' |');
    lines.push('|' + fields.map(() => '---').join('|') + '|');

    records.slice(0, 50).forEach(record => {
      const values = fields.map(field => {
        const value = record.fields[field];
        return formatAirtableValue(value, 80);
      });
      lines.push('| ' + values.join(' | ') + ' |');
    });

    if (records.length > 50) {
      lines.push('');
      lines.push(`*...and ${records.length - 50} more records*`);
    }
  }

  return lines.join('\n');
}

function formatAirtableValue(value: unknown, maxLength?: number): string {
  if (value === null || value === undefined) {
    return '-';
  }

  // Handle arrays (like linked records, multiple select, attachments)
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';

    // Check if it's an array of attachments
    if (value[0] && typeof value[0] === 'object' && 'url' in value[0]) {
      return `[${value.length} attachment(s)]`;
    }

    // Check if it's an array of linked records (just IDs)
    if (typeof value[0] === 'string' && value[0].startsWith('rec')) {
      return `[${value.length} linked record(s)]`;
    }

    // Otherwise, join values
    const joined = value.join(', ');
    if (maxLength && joined.length > maxLength) {
      return joined.substring(0, maxLength) + '...';
    }
    return joined;
  }

  // Handle objects (like collaborators, buttons, etc.)
  if (typeof value === 'object') {
    // Collaborator field
    if ('email' in value && 'name' in value) {
      return String((value as { name: string }).name);
    }
    return '[complex data]';
  }

  // Handle primitives
  const str = String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  if (maxLength && str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
}

// Common Airtable filter formulas for convenience
export const AIRTABLE_FILTER_TEMPLATES = {
  // Filter by status field
  activeOnly: "AND({Status} = 'Active', NOT({Archived}))",
  confirmedSpeakers: "{Confirmed} = TRUE()",
  upcomingEvents: "IS_AFTER({Date}, TODAY())",
  thisMonth: "AND(IS_AFTER({Date}, DATEADD(TODAY(), -1, 'months')), IS_BEFORE({Date}, DATEADD(TODAY(), 1, 'months')))",

  // Search by text
  containsText: (field: string, text: string) => `SEARCH("${text}", {${field}})`,

  // Filter by specific value
  equals: (field: string, value: string) => `{${field}} = "${value}"`,

  // Multiple conditions
  and: (...conditions: string[]) => `AND(${conditions.join(', ')})`,
  or: (...conditions: string[]) => `OR(${conditions.join(', ')})`,
};

// Helper to build Airtable filter formulas
export function buildAirtableFilter(options: {
  status?: string;
  search?: { field: string; text: string };
  dateField?: { field: string; after?: string; before?: string };
  custom?: string;
}): string | undefined {
  const conditions: string[] = [];

  if (options.status) {
    conditions.push(`{Status} = "${options.status}"`);
  }

  if (options.search) {
    conditions.push(`SEARCH("${options.search.text}", {${options.search.field}})`);
  }

  if (options.dateField) {
    if (options.dateField.after) {
      conditions.push(`IS_AFTER({${options.dateField.field}}, "${options.dateField.after}")`);
    }
    if (options.dateField.before) {
      conditions.push(`IS_BEFORE({${options.dateField.field}}, "${options.dateField.before}")`);
    }
  }

  if (options.custom) {
    conditions.push(options.custom);
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return `AND(${conditions.join(', ')})`;
}
