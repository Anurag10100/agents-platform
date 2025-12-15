// In-memory generation logs store
// In production, this would be replaced with a database

export interface GenerationLog {
  id: string;
  timestamp: string;
  skillId: string;
  skillName: string;
  inputData: Record<string, any>;
  sourceUrl?: string;
  customInstructions?: string;
  outputFormat: string;
  outputLength: number;
  outputPreview: string; // First 500 chars
  fullOutput: string;
  imagesCount: number;
  urlImagesCount: number;
  durationMs: number;
  status: 'success' | 'error';
  error?: string;
}

export interface DashboardStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  generationsBySkill: Record<string, number>;
  averageDurationMs: number;
  totalOutputChars: number;
  recentActivity: { date: string; count: number }[];
}

// In-memory store (will reset on server restart)
const logs: GenerationLog[] = [];
const MAX_LOGS = 500; // Keep last 500 logs in memory

export function addLog(log: Omit<GenerationLog, 'id' | 'timestamp'>): GenerationLog {
  const newLog: GenerationLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newLog); // Add to beginning

  // Keep only recent logs
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }

  return newLog;
}

export function getLogs(options?: {
  limit?: number;
  offset?: number;
  skillId?: string;
  status?: 'success' | 'error';
}): { logs: GenerationLog[]; total: number } {
  let filtered = [...logs];

  if (options?.skillId) {
    filtered = filtered.filter(log => log.skillId === options.skillId);
  }

  if (options?.status) {
    filtered = filtered.filter(log => log.status === options.status);
  }

  const total = filtered.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

export function getLogById(id: string): GenerationLog | undefined {
  return logs.find(log => log.id === id);
}

export function getStats(): DashboardStats {
  const now = new Date();
  const last7Days: Record<string, number> = {};

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days[dateStr] = 0;
  }

  const generationsBySkill: Record<string, number> = {};
  let totalDuration = 0;
  let totalOutputChars = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const log of logs) {
    // Count by skill
    generationsBySkill[log.skillName] = (generationsBySkill[log.skillName] || 0) + 1;

    // Duration
    totalDuration += log.durationMs;

    // Output chars
    totalOutputChars += log.outputLength;

    // Status
    if (log.status === 'success') {
      successCount++;
    } else {
      errorCount++;
    }

    // Activity by day
    const logDate = log.timestamp.split('T')[0];
    if (last7Days.hasOwnProperty(logDate)) {
      last7Days[logDate]++;
    }
  }

  return {
    totalGenerations: logs.length,
    successfulGenerations: successCount,
    failedGenerations: errorCount,
    generationsBySkill,
    averageDurationMs: logs.length > 0 ? Math.round(totalDuration / logs.length) : 0,
    totalOutputChars,
    recentActivity: Object.entries(last7Days).map(([date, count]) => ({ date, count })),
  };
}

export function clearLogs(): void {
  logs.length = 0;
}
