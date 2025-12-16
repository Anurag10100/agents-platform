'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DataSource,
  RSSDataSource,
  GoogleSheetsDataSource,
  AirtableDataSource,
  DatabaseDataSource,
  PREDEFINED_RSS_FEEDS,
  PredefinedRSSFeed,
  DataFetchResult,
} from '@/lib/data-sources/types';
import styles from './page.module.css';

type TabType = 'rss' | 'sheets' | 'airtable' | 'database';

interface SourceTestResult {
  sourceId: string;
  success: boolean;
  message: string;
  itemCount?: number;
}

export default function DataSourcesPage() {
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('rss');
  const [testResults, setTestResults] = useState<Record<string, SourceTestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Form states for adding new sources
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormType, setAddFormType] = useState<TabType>('rss');

  // RSS Form
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssMaxItems, setRssMaxItems] = useState(10);

  // Google Sheets Form
  const [sheetsName, setSheetsName] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsSheet, setSheetsSheet] = useState('');
  const [sheetsApiKey, setSheetsApiKey] = useState('');

  // Airtable Form
  const [airtableName, setAirtableName] = useState('');
  const [airtableBaseId, setAirtableBaseId] = useState('');
  const [airtableTable, setAirtableTable] = useState('');
  const [airtableApiKey, setAirtableApiKey] = useState('');
  const [airtableView, setAirtableView] = useState('');

  // Database Form
  const [dbName, setDbName] = useState('');
  const [dbTable, setDbTable] = useState('');

  // Load sources from localStorage
  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = () => {
    try {
      const stored = localStorage.getItem('newsletter_data_sources');
      if (stored) {
        setSources(JSON.parse(stored));
      }
    } catch {
      console.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const saveSources = (newSources: DataSource[]) => {
    localStorage.setItem('newsletter_data_sources', JSON.stringify(newSources));
    setSources(newSources);
  };

  const addPredefinedFeed = (feed: PredefinedRSSFeed) => {
    const newSource: RSSDataSource = {
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

    const exists = sources.find(s => s.id === feed.id);
    if (exists) {
      alert('This feed is already added');
      return;
    }

    saveSources([...sources, newSource]);
  };

  const addCustomSource = () => {
    let newSource: DataSource;
    const id = `custom-${Date.now()}`;
    const now = new Date().toISOString();

    switch (addFormType) {
      case 'rss':
        if (!rssName || !rssUrl) {
          alert('Name and URL are required');
          return;
        }
        newSource = {
          id,
          name: rssName,
          type: 'rss',
          enabled: true,
          config: {
            url: rssUrl,
            maxItems: rssMaxItems,
            includeFullContent: false,
          },
          createdAt: now,
          updatedAt: now,
        } as RSSDataSource;
        setRssName('');
        setRssUrl('');
        setRssMaxItems(10);
        break;

      case 'sheets':
        if (!sheetsName || !sheetsUrl) {
          alert('Name and Spreadsheet URL/ID are required');
          return;
        }
        // Extract spreadsheet ID from URL
        let spreadsheetId = sheetsUrl;
        const urlMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch) {
          spreadsheetId = urlMatch[1];
        }
        newSource = {
          id,
          name: sheetsName,
          type: 'google_sheets',
          enabled: true,
          config: {
            spreadsheetId,
            sheetName: sheetsSheet || undefined,
            apiKey: sheetsApiKey || undefined,
            headerRow: true,
          },
          createdAt: now,
          updatedAt: now,
        } as GoogleSheetsDataSource;
        setSheetsName('');
        setSheetsUrl('');
        setSheetsSheet('');
        setSheetsApiKey('');
        break;

      case 'airtable':
        if (!airtableName || !airtableBaseId || !airtableTable || !airtableApiKey) {
          alert('Name, Base ID, Table Name, and API Key are required');
          return;
        }
        newSource = {
          id,
          name: airtableName,
          type: 'airtable',
          enabled: true,
          config: {
            baseId: airtableBaseId,
            tableName: airtableTable,
            apiKey: airtableApiKey,
            view: airtableView || undefined,
            maxRecords: 100,
          },
          createdAt: now,
          updatedAt: now,
        } as AirtableDataSource;
        setAirtableName('');
        setAirtableBaseId('');
        setAirtableTable('');
        setAirtableApiKey('');
        setAirtableView('');
        break;

      case 'database':
        if (!dbName || !dbTable) {
          alert('Name and Table are required');
          return;
        }
        // Get Supabase config from env (will be read on the server)
        newSource = {
          id,
          name: dbName,
          type: 'database',
          enabled: true,
          config: {
            connectionType: 'supabase',
            table: dbTable,
          },
          createdAt: now,
          updatedAt: now,
        } as DatabaseDataSource;
        setDbName('');
        setDbTable('');
        break;

      default:
        return;
    }

    saveSources([...sources, newSource]);
    setShowAddForm(false);
  };

  const removeSource = (sourceId: string) => {
    if (confirm('Are you sure you want to remove this data source?')) {
      saveSources(sources.filter(s => s.id !== sourceId));
    }
  };

  const toggleSource = (sourceId: string) => {
    saveSources(
      sources.map(s =>
        s.id === sourceId
          ? { ...s, enabled: !s.enabled, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const testSource = async (source: DataSource) => {
    setTesting(source.id);
    setTestResults(prev => ({ ...prev, [source.id]: { sourceId: source.id, success: false, message: 'Testing...' } }));

    try {
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch',
          source,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.success) {
        setTestResults(prev => ({
          ...prev,
          [source.id]: {
            sourceId: source.id,
            success: true,
            message: `Success! Fetched ${result.data.metadata?.totalItems || 0} items`,
            itemCount: result.data.metadata?.totalItems,
          },
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [source.id]: {
            sourceId: source.id,
            success: false,
            message: result.data?.error || result.error || 'Unknown error',
          },
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [source.id]: {
          sourceId: source.id,
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const getSourcesByType = (type: TabType): DataSource[] => {
    return sources.filter(s => s.type === type);
  };

  const getCategoryFeeds = (category: string): PredefinedRSSFeed[] => {
    return PREDEFINED_RSS_FEEDS.filter(f => f.category === category);
  };

  const categories = [...new Set(PREDEFINED_RSS_FEEDS.map(f => f.category))];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading data sources...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.backLink}>
            ← Back to Chat
          </a>
          <h1 className={styles.title}>Data Sources</h1>
          <p className={styles.subtitle}>
            Connect real-time data sources to enhance your content generation with live news, database records, and spreadsheet data.
          </p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.sourceCount}>
            {sources.filter(s => s.enabled).length} active source{sources.filter(s => s.enabled).length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'rss' ? styles.active : ''}`}
          onClick={() => setActiveTab('rss')}
        >
          RSS Feeds ({getSourcesByType('rss').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sheets' ? styles.active : ''}`}
          onClick={() => setActiveTab('sheets')}
        >
          Google Sheets ({getSourcesByType('sheets').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'airtable' ? styles.active : ''}`}
          onClick={() => setActiveTab('airtable')}
        >
          Airtable ({getSourcesByType('airtable').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'database' ? styles.active : ''}`}
          onClick={() => setActiveTab('database')}
        >
          Database ({getSourcesByType('database').length})
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* RSS Tab */}
        {activeTab === 'rss' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>RSS Feeds</h2>
              <button
                className={styles.addBtn}
                onClick={() => {
                  setAddFormType('rss');
                  setShowAddForm(true);
                }}
              >
                + Add Custom Feed
              </button>
            </div>
            <p className={styles.sectionDesc}>
              Connect to RSS feeds for live news and updates. Data is fetched in real-time during content generation.
            </p>

            {/* Active RSS Sources */}
            {getSourcesByType('rss').length > 0 && (
              <div className={styles.sourceList}>
                <h3 className={styles.listTitle}>Active Feeds</h3>
                {getSourcesByType('rss').map(source => (
                  <div key={source.id} className={`${styles.sourceItem} ${!source.enabled ? styles.disabled : ''}`}>
                    <div className={styles.sourceInfo}>
                      <div className={styles.sourceName}>{source.name}</div>
                      <div className={styles.sourceUrl}>{(source as RSSDataSource).config.url}</div>
                      {testResults[source.id] && (
                        <div className={`${styles.testResult} ${testResults[source.id].success ? styles.success : styles.error}`}>
                          {testResults[source.id].message}
                        </div>
                      )}
                    </div>
                    <div className={styles.sourceActions}>
                      <button
                        className={styles.testBtn}
                        onClick={() => testSource(source)}
                        disabled={testing === source.id}
                      >
                        {testing === source.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${source.enabled ? styles.enabled : ''}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        {source.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeSource(source.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Predefined Feeds */}
            <div className={styles.predefinedSection}>
              <h3 className={styles.listTitle}>Quick Add - Indian News Sources</h3>
              {categories.map(category => (
                <div key={category} className={styles.categoryGroup}>
                  <h4 className={styles.categoryTitle}>{category}</h4>
                  <div className={styles.feedGrid}>
                    {getCategoryFeeds(category).map(feed => {
                      const isAdded = sources.some(s => s.id === feed.id);
                      return (
                        <div key={feed.id} className={styles.feedCard}>
                          <div className={styles.feedInfo}>
                            <div className={styles.feedName}>{feed.name}</div>
                            <div className={styles.feedDesc}>{feed.description}</div>
                          </div>
                          <button
                            className={`${styles.addFeedBtn} ${isAdded ? styles.added : ''}`}
                            onClick={() => addPredefinedFeed(feed)}
                            disabled={isAdded}
                          >
                            {isAdded ? 'Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Sheets Tab */}
        {activeTab === 'sheets' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Google Sheets</h2>
              <button
                className={styles.addBtn}
                onClick={() => {
                  setAddFormType('sheets');
                  setShowAddForm(true);
                }}
              >
                + Add Spreadsheet
              </button>
            </div>
            <p className={styles.sectionDesc}>
              Import data directly from Google Sheets. Spreadsheets must be shared with "Anyone with the link can view" or use an API key.
            </p>

            {/* Active Sheets Sources */}
            {getSourcesByType('sheets').length > 0 ? (
              <div className={styles.sourceList}>
                <h3 className={styles.listTitle}>Connected Spreadsheets</h3>
                {getSourcesByType('sheets').map(source => (
                  <div key={source.id} className={`${styles.sourceItem} ${!source.enabled ? styles.disabled : ''}`}>
                    <div className={styles.sourceInfo}>
                      <div className={styles.sourceName}>{source.name}</div>
                      <div className={styles.sourceUrl}>
                        ID: {(source as GoogleSheetsDataSource).config.spreadsheetId}
                        {(source as GoogleSheetsDataSource).config.sheetName && ` | Sheet: ${(source as GoogleSheetsDataSource).config.sheetName}`}
                      </div>
                      {testResults[source.id] && (
                        <div className={`${styles.testResult} ${testResults[source.id].success ? styles.success : styles.error}`}>
                          {testResults[source.id].message}
                        </div>
                      )}
                    </div>
                    <div className={styles.sourceActions}>
                      <button
                        className={styles.testBtn}
                        onClick={() => testSource(source)}
                        disabled={testing === source.id}
                      >
                        {testing === source.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${source.enabled ? styles.enabled : ''}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        {source.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeSource(source.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No Google Sheets connected yet. Click "Add Spreadsheet" to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Airtable Tab */}
        {activeTab === 'airtable' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Airtable</h2>
              <button
                className={styles.addBtn}
                onClick={() => {
                  setAddFormType('airtable');
                  setShowAddForm(true);
                }}
              >
                + Add Airtable Base
              </button>
            </div>
            <p className={styles.sectionDesc}>
              Connect to Airtable bases to import structured data. Requires your Airtable API key and Base ID.
            </p>

            {/* Active Airtable Sources */}
            {getSourcesByType('airtable').length > 0 ? (
              <div className={styles.sourceList}>
                <h3 className={styles.listTitle}>Connected Bases</h3>
                {getSourcesByType('airtable').map(source => (
                  <div key={source.id} className={`${styles.sourceItem} ${!source.enabled ? styles.disabled : ''}`}>
                    <div className={styles.sourceInfo}>
                      <div className={styles.sourceName}>{source.name}</div>
                      <div className={styles.sourceUrl}>
                        Table: {(source as AirtableDataSource).config.tableName}
                        {(source as AirtableDataSource).config.view && ` | View: ${(source as AirtableDataSource).config.view}`}
                      </div>
                      {testResults[source.id] && (
                        <div className={`${styles.testResult} ${testResults[source.id].success ? styles.success : styles.error}`}>
                          {testResults[source.id].message}
                        </div>
                      )}
                    </div>
                    <div className={styles.sourceActions}>
                      <button
                        className={styles.testBtn}
                        onClick={() => testSource(source)}
                        disabled={testing === source.id}
                      >
                        {testing === source.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${source.enabled ? styles.enabled : ''}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        {source.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeSource(source.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No Airtable bases connected yet. Click "Add Airtable Base" to get started.</p>
                <div className={styles.helpText}>
                  <strong>To get your Airtable credentials:</strong>
                  <ol>
                    <li>Go to <a href="https://airtable.com/account" target="_blank" rel="noopener">airtable.com/account</a></li>
                    <li>Generate a personal access token</li>
                    <li>Find your Base ID in the Airtable URL (starts with "app")</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Database (Supabase)</h2>
              <button
                className={styles.addBtn}
                onClick={() => {
                  setAddFormType('database');
                  setShowAddForm(true);
                }}
              >
                + Add Table
              </button>
            </div>
            <p className={styles.sectionDesc}>
              Connect to your Supabase database to pull speaker lists, event details, or subscriber data.
              Uses the Supabase credentials configured in your environment.
            </p>

            {/* Active Database Sources */}
            {getSourcesByType('database').length > 0 ? (
              <div className={styles.sourceList}>
                <h3 className={styles.listTitle}>Connected Tables</h3>
                {getSourcesByType('database').map(source => (
                  <div key={source.id} className={`${styles.sourceItem} ${!source.enabled ? styles.disabled : ''}`}>
                    <div className={styles.sourceInfo}>
                      <div className={styles.sourceName}>{source.name}</div>
                      <div className={styles.sourceUrl}>Table: {(source as DatabaseDataSource).config.table}</div>
                      {testResults[source.id] && (
                        <div className={`${styles.testResult} ${testResults[source.id].success ? styles.success : styles.error}`}>
                          {testResults[source.id].message}
                        </div>
                      )}
                    </div>
                    <div className={styles.sourceActions}>
                      <button
                        className={styles.testBtn}
                        onClick={() => testSource(source)}
                        disabled={testing === source.id}
                      >
                        {testing === source.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className={`${styles.toggleBtn} ${source.enabled ? styles.enabled : ''}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        {source.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeSource(source.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No database tables connected yet. Click "Add Table" to get started.</p>
                <div className={styles.helpText}>
                  <strong>Suggested CRM tables:</strong>
                  <ul>
                    <li><code>speakers</code> - Speaker information for events</li>
                    <li><code>events</code> - Event details and schedules</li>
                    <li><code>subscribers</code> - Newsletter subscriber data</li>
                    <li><code>sponsors</code> - Sponsor information</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      {showAddForm && (
        <div className={styles.modal} onClick={() => setShowAddForm(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              Add {addFormType === 'rss' ? 'RSS Feed' : addFormType === 'sheets' ? 'Google Sheet' : addFormType === 'airtable' ? 'Airtable Base' : 'Database Table'}
            </h2>

            {addFormType === 'rss' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={rssName}
                    onChange={e => setRssName(e.target.value)}
                    placeholder="e.g., Tech News"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>RSS Feed URL</label>
                  <input
                    type="url"
                    className={styles.input}
                    value={rssUrl}
                    onChange={e => setRssUrl(e.target.value)}
                    placeholder="https://example.com/rss"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Items</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={rssMaxItems}
                    onChange={e => setRssMaxItems(parseInt(e.target.value) || 10)}
                    min={1}
                    max={50}
                  />
                </div>
              </>
            )}

            {addFormType === 'sheets' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={sheetsName}
                    onChange={e => setSheetsName(e.target.value)}
                    placeholder="e.g., Speaker List"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Spreadsheet URL or ID</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={sheetsUrl}
                    onChange={e => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sheet Name (optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={sheetsSheet}
                    onChange={e => setSheetsSheet(e.target.value)}
                    placeholder="Sheet1"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>API Key (optional)</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={sheetsApiKey}
                    onChange={e => setSheetsApiKey(e.target.value)}
                    placeholder="For private sheets"
                  />
                  <small className={styles.hint}>Leave empty for public sheets shared with "Anyone with the link"</small>
                </div>
              </>
            )}

            {addFormType === 'airtable' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={airtableName}
                    onChange={e => setAirtableName(e.target.value)}
                    placeholder="e.g., Event Speakers"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Base ID</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={airtableBaseId}
                    onChange={e => setAirtableBaseId(e.target.value)}
                    placeholder="app..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Table Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={airtableTable}
                    onChange={e => setAirtableTable(e.target.value)}
                    placeholder="Speakers"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>API Key</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={airtableApiKey}
                    onChange={e => setAirtableApiKey(e.target.value)}
                    placeholder="pat..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>View (optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={airtableView}
                    onChange={e => setAirtableView(e.target.value)}
                    placeholder="Grid view"
                  />
                </div>
              </>
            )}

            {addFormType === 'database' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    placeholder="e.g., Event Speakers"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Table Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={dbTable}
                    onChange={e => setDbTable(e.target.value)}
                    placeholder="speakers"
                  />
                </div>
                <small className={styles.hint}>Uses Supabase credentials from environment variables</small>
              </>
            )}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button className={styles.submitBtn} onClick={addCustomSource}>
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
