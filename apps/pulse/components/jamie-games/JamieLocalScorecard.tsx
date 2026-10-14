'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { JAMIE_RECORD_KEYS, readJamieScorecard, type JamieRecordStatus } from '@/lib/jamie-games/records';

type Snapshot = ReturnType<typeof readJamieScorecard>;
const recordKeys: readonly string[] = Object.values(JAMIE_RECORD_KEYS);

function RecordCard({ title, status, summary }: { title: string; status?: JamieRecordStatus; summary: string }) {
  return (
    <div role="group" aria-label={`${title} record`} className="fieldbook-record min-w-0">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {!status ? 'Reading record…' : status === 'unavailable' ? 'Storage unavailable' : status === 'invalid' ? 'Saved record unreadable' : summary}
      </p>
    </div>
  );
}

export function JamieLocalScorecard() {
  const [records, setRecords] = useState<Snapshot | null>(null);

  useEffect(() => {
    const refresh = () => setRecords(readJamieScorecard());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || recordKeys.includes(event.key)) refresh();
    };
    refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);

  const chess = records?.chess.value;
  const poker = records?.poker.value;
  const volley = records?.volley.value;

  return (
    <section aria-labelledby="local-records-title" className="fieldbook-panel">
      <h2 id="local-records-title" className="flex items-center gap-2 text-xl font-black text-white">
        <Trophy className="h-5 w-5 text-violet-200" aria-hidden="true" /> Your local records
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Saved in this browser. No sign-in needed; records are not synced between devices. Crash Bash keeps its own records.</p>
      <div className="mt-5 space-y-3">
        <RecordCard title="Chess" status={records?.chess.status} summary={chess ? `${chess.wins} wins · ${chess.draws} draws · ${chess.losses} losses` : ''} />
        <RecordCard title="Block Drop" status={records?.tetris.status} summary={`Best score: ${records?.tetris.value ?? 0}`} />
        <RecordCard title="Poker" status={records?.poker.status} summary={poker ? `${poker.hands} hands · ${poker.wins} wins · ${poker.ties} ties · ${poker.losses} losses` : ''} />
        <RecordCard title="Sunset Volley" status={records?.volley.status} summary={volley ? `${volley.matches} matches · ${volley.wins} wins · ${volley.losses} losses` : ''} />
      </div>
      {records && Object.values(records).some((record) => record.status === 'unavailable') ? (
        <p className="mt-4 text-sm leading-6 text-amber-200">Browser storage could not be read. Games remain playable, but saving records may be unavailable.</p>
      ) : null}
      {records && Object.values(records).some((record) => record.status === 'invalid') ? (
        <p className="mt-4 text-sm leading-6 text-amber-200">An unreadable record was ignored. Valid records remain visible; new scores and completed matches can start a fresh record.</p>
      ) : null}
    </section>
  );
}
