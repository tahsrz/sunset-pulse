export type JamieGameRecords = {
  chess: { wins: number; draws: number; losses: number };
  poker: { hands: number; wins: number; losses: number; ties: number };
  tetris: number;
  volley: { matches: number; wins: number; losses: number };
};
export type JamieRecordStatus = 'saved' | 'empty' | 'invalid' | 'unavailable';
type Game = keyof JamieGameRecords;
type RecordRead<K extends Game> = { value: JamieGameRecords[K]; status: JamieRecordStatus };

// Keep the established keys and formats so existing browser records remain usable.
export const JAMIE_RECORD_KEYS = {
  chess: 'sunset_play_jamie_chess_record',
  poker: 'sunset_play_jamie_poker_stats',
  tetris: 'sunset_play_jamie_tetris_high_score',
  volley: 'sunset_play_jamie_volley_stats',
} as const;

const defaults: JamieGameRecords = {
  chess: { wins: 0, draws: 0, losses: 0 },
  poker: { hands: 0, wins: 0, losses: 0, ties: 0 },
  tetris: 0,
  volley: { matches: 0, wins: 0, losses: 0 },
};

function emptyRecord<K extends Game>(game: K): JamieGameRecords[K] {
  const value: JamieGameRecords[Game] = defaults[game];
  return (typeof value === 'number' ? value : { ...value }) as JamieGameRecords[K];
}

function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function decodeRecord<K extends Game>(game: K, raw: string | null): RecordRead<K> {
  const fallback = { value: emptyRecord(game), status: 'invalid' as const };
  if (raw === null) return { value: emptyRecord(game), status: 'empty' };
  if (raw.length > 4096) return fallback;
  if (game === 'tetris') {
    const score = Number(raw);
    return /^(0|[1-9]\d*)$/.test(raw) && isCount(score)
      ? { value: score as JamieGameRecords[K], status: 'saved' }
      : fallback;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    const fields = Object.keys(defaults[game]);
    const record = parsed as Record<string, unknown>;
    if (!fields.every((field) => isCount(record[field]))) return fallback;
    return {
      value: Object.fromEntries(fields.map((field) => [field, record[field]])) as JamieGameRecords[K],
      status: 'saved',
    };
  } catch { return fallback; }
}

export function readJamieGameRecord<K extends Game>(
  game: K, storage: Pick<Storage, 'getItem'> | null = browserStorage(),
): RecordRead<K> {
  try {
    if (storage) return decodeRecord(game, storage.getItem(JAMIE_RECORD_KEYS[game]));
  } catch { /* Storage may be disabled by browser policy. */ }
  return { value: emptyRecord(game), status: 'unavailable' };
}

export function saveJamieGameRecord<K extends Game>(
  game: K, value: JamieGameRecords[K], storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): boolean {
  try {
    const raw = game === 'tetris' ? String(value) : JSON.stringify(value);
    const decoded = decodeRecord(game, raw);
    if (!storage || decoded.status !== 'saved') return false;
    const normalized = game === 'tetris' ? String(decoded.value) : JSON.stringify(decoded.value);
    storage.setItem(JAMIE_RECORD_KEYS[game], normalized);
    return true;
  } catch { return false; }
}

export function readJamieScorecard(storage: Pick<Storage, 'getItem'> | null = browserStorage()) {
  return {
    chess: readJamieGameRecord('chess', storage),
    poker: readJamieGameRecord('poker', storage),
    tetris: readJamieGameRecord('tetris', storage),
    volley: readJamieGameRecord('volley', storage),
  };
}
