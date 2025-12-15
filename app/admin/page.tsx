'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './admin.module.css';

interface GenerationLog {
  id: string;
  timestamp: string;
  skillId: string;
  skillName: string;
  inputData: Record<string, any>;
  sourceUrl?: string;
  customInstructions?: string;
  outputFormat: string;
  outputLength: number;
  outputPreview: string;
  fullOutput: string;
  imagesCount: number;
  urlImagesCount: number;
  durationMs: number;
  status: 'success' | 'error';
  error?: string;
}

interface DashboardStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  generationsBySkill: Record<string, number>;
  averageDurationMs: number;
  totalOutputChars: number;
  recentActivity: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<GenerationLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{ skillId?: string; status?: string }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pageSize = 20;

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs?action=stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
      });
      if (filter.skillId) params.append('skillId', filter.skillId);
      if (filter.status) params.append('status', filter.status);

      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();
      setLogs(data.logs);
      setTotalLogs(data.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setIsLoading(false);
  }, [currentPage, filter]);

  const fetchLogDetails = async (logId: string) => {
    try {
      const response = await fetch(`/api/admin/logs?id=${logId}`);
      const data = await response.json();
      setSelectedLog(data);
    } catch (error) {
      console.error('Failed to fetch log details:', error);
    }
  };

  const clearAllLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      return;
    }
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      fetchStats();
      fetchLogs();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchLogs]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.backLink}>← Back to App</a>
          <h1 className={styles.title}>Admin Dashboard</h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.refreshBtn} onClick={() => { fetchStats(); fetchLogs(); }}>
            Refresh
          </button>
          <button className={styles.themeBtn} onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats?.totalGenerations || 0}</div>
          <div className={styles.statLabel}>Total Generations</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.success}`}>
            {stats?.successfulGenerations || 0}
          </div>
          <div className={styles.statLabel}>Successful</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.error}`}>
            {stats?.failedGenerations || 0}
          </div>
          <div className={styles.statLabel}>Failed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {formatDuration(stats?.averageDurationMs || 0)}
          </div>
          <div className={styles.statLabel}>Avg Duration</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {formatNumber(stats?.totalOutputChars || 0)}
          </div>
          <div className={styles.statLabel}>Total Output Chars</div>
        </div>
      </div>

      {/* Activity Chart */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className={styles.chartSection}>
          <h3 className={styles.sectionTitle}>Last 7 Days Activity</h3>
          <div className={styles.chart}>
            {stats.recentActivity.map((day) => {
              const maxCount = Math.max(...stats.recentActivity.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className={styles.chartBar}>
                  <div
                    className={styles.bar}
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${day.count} generations`}
                  />
                  <div className={styles.barLabel}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={styles.barCount}>{day.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills Breakdown */}
      {stats?.generationsBySkill && Object.keys(stats.generationsBySkill).length > 0 && (
        <div className={styles.skillsSection}>
          <h3 className={styles.sectionTitle}>Generations by Skill</h3>
          <div className={styles.skillsGrid}>
            {Object.entries(stats.generationsBySkill).map(([skill, count]) => (
              <div key={skill} className={styles.skillCard}>
                <div className={styles.skillName}>{skill}</div>
                <div className={styles.skillCount}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className={styles.logsSection}>
        <div className={styles.logsHeader}>
          <h3 className={styles.sectionTitle}>Generation Logs</h3>
          <div className={styles.logsActions}>
            <select
              className={styles.filterSelect}
              value={filter.status || ''}
              onChange={(e) => {
                setFilter(f => ({ ...f, status: e.target.value || undefined }));
                setCurrentPage(0);
              }}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
            <button className={styles.clearBtn} onClick={clearAllLogs}>
              Clear All Logs
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <div className={styles.emptyText}>No generation logs yet</div>
            <div className={styles.emptyHint}>
              Logs will appear here as users generate content
            </div>
          </div>
        ) : (
          <>
            <div className={styles.logsTable}>
              <div className={styles.tableHeader}>
                <div className={styles.colTime}>Time</div>
                <div className={styles.colSkill}>Skill</div>
                <div className={styles.colStatus}>Status</div>
                <div className={styles.colDuration}>Duration</div>
                <div className={styles.colOutput}>Output</div>
                <div className={styles.colActions}>Actions</div>
              </div>
              {logs.map((log) => (
                <div key={log.id} className={styles.tableRow}>
                  <div className={styles.colTime}>
                    {formatDate(log.timestamp)}
                  </div>
                  <div className={styles.colSkill}>{log.skillName}</div>
                  <div className={styles.colStatus}>
                    <span className={`${styles.statusBadge} ${styles[log.status]}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className={styles.colDuration}>
                    {formatDuration(log.durationMs)}
                  </div>
                  <div className={styles.colOutput}>
                    {formatNumber(log.outputLength)} chars
                  </div>
                  <div className={styles.colActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => fetchLogDetails(log.id)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className={styles.modal} onClick={() => setSelectedLog(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Generation Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <label>ID</label>
                  <span>{selectedLog.id}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Timestamp</label>
                  <span>{formatDate(selectedLog.timestamp)}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Skill</label>
                  <span>{selectedLog.skillName}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Status</label>
                  <span className={`${styles.statusBadge} ${styles[selectedLog.status]}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <label>Duration</label>
                  <span>{formatDuration(selectedLog.durationMs)}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Output Format</label>
                  <span>{selectedLog.outputFormat.toUpperCase()}</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Output Length</label>
                  <span>{formatNumber(selectedLog.outputLength)} chars</span>
                </div>
                <div className={styles.detailItem}>
                  <label>Images</label>
                  <span>
                    {selectedLog.imagesCount} uploaded, {selectedLog.urlImagesCount} from URL
                  </span>
                </div>
              </div>

              {selectedLog.sourceUrl && (
                <div className={styles.detailSection}>
                  <label>Source URL</label>
                  <div className={styles.detailCode}>{selectedLog.sourceUrl}</div>
                </div>
              )}

              {selectedLog.customInstructions && (
                <div className={styles.detailSection}>
                  <label>Custom Instructions</label>
                  <div className={styles.detailCode}>{selectedLog.customInstructions}</div>
                </div>
              )}

              <div className={styles.detailSection}>
                <label>Input Data</label>
                <pre className={styles.detailCode}>
                  {JSON.stringify(selectedLog.inputData, null, 2)}
                </pre>
              </div>

              {selectedLog.error && (
                <div className={styles.detailSection}>
                  <label>Error</label>
                  <div className={`${styles.detailCode} ${styles.errorText}`}>
                    {selectedLog.error}
                  </div>
                </div>
              )}

              <div className={styles.detailSection}>
                <label>Full Output</label>
                <pre className={styles.outputPreview}>
                  {selectedLog.fullOutput}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
