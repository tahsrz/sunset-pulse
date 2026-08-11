import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export type WikipediaProcessSnapshot = {
  generatedAt: string;
  worker: {
    running: boolean;
    processes: Array<{ pid: number; parentPid: number; name: string; commandLine: string }>;
  };
  scheduler: {
    registered: boolean;
    state: string;
    lastRunTime: string | null;
    lastTaskResult: number | null;
  };
  ingestion: {
    state: Record<string, unknown> | null;
    log: string[];
  };
};

const APP_ROOT = process.cwd();
const WIKIPEDIA_ROOT = path.join(APP_ROOT, 'cartridges', 'wikipedia');
const LOG_ROOT = path.join(APP_ROOT, 'scripts', 'logs');

export function getWikipediaProcessSnapshot(): WikipediaProcessSnapshot {
  const processes = readWorkerProcesses();
  const scheduler = readScheduler();
  const state = readJson(path.join(WIKIPEDIA_ROOT, 'ingestion-state.json'));
  const heartbeat = isRecent(state?.updatedAt);

  return {
    generatedAt: new Date().toISOString(),
    worker: {
      running: processes.length > 0 || heartbeat,
      processes,
    },
    scheduler,
    ingestion: {
      state,
      log: readTail(path.join(LOG_ROOT, 'wikipedia-crawl4ai.out.log')),
    },
  };
}

function readWorkerProcesses() {
  try {
    if (process.platform === 'win32') {
      const script = "Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -like '*crawl-wikipedia-to-tah*' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress";
      const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 2500, stdio: ['ignore', 'pipe', 'ignore'] });
      const parsed = output.trim() ? JSON.parse(output) : [];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.map(item => ({
        pid: Number(item.ProcessId),
        parentPid: Number(item.ParentProcessId),
        name: String(item.Name || ''),
        commandLine: compact(String(item.CommandLine || '')),
      })).filter(item => item.pid > 0);
    }

    return execFileSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8', timeout: 2500 })
      .split('\n')
      .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/))
      .filter(match => match && /crawl-wikipedia-to-tah/i.test(match[4]))
      .map(match => ({ pid: Number(match![1]), parentPid: Number(match![2]), name: match![3], commandLine: compact(match![4]) }));
  } catch {
    return [];
  }
}

function readScheduler() {
  if (process.platform !== 'win32') {
    return { registered: false, state: 'unsupported', lastRunTime: null, lastTaskResult: null };
  }

  try {
    const script = "$task = Get-ScheduledTask -TaskName 'SunsetPulse Web Knowledge Worker' -ErrorAction Stop; $info = Get-ScheduledTaskInfo -TaskName 'SunsetPulse Web Knowledge Worker' -ErrorAction Stop; [pscustomobject]@{ State = [string]$task.State; LastRunTime = [string]$info.LastRunTime; LastTaskResult = [int64]$info.LastTaskResult } | ConvertTo-Json -Compress";
    const parsed = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 2500, stdio: ['ignore', 'pipe', 'ignore'] }));
    return {
      registered: true,
      state: String(parsed.State || 'unknown'),
      lastRunTime: parsed.LastRunTime || null,
      lastTaskResult: Number.isFinite(Number(parsed.LastTaskResult)) ? Number(parsed.LastTaskResult) : null,
    };
  } catch {
    return { registered: false, state: 'permission limited', lastRunTime: null, lastTaskResult: null };
  }
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readTail(filePath: string, lineCount = 80) {
  try {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).slice(-lineCount);
  } catch {
    return [];
  }
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function isRecent(value: unknown) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp < 90_000;
}
