'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MessageSquareText, RotateCcw, ShieldCheck, Swords, Zap } from 'lucide-react';
import type { IntelligenceWorker } from '@/lib/command-center/workerRoster';
import { computeEnemyDamage, computePlayerDamage, resolveBattleTurn } from '@/lib/quest/battleRules';
import {
  createInitialBattleState,
  getEncounterById,
  pickRandomEncounter,
  STARTER_ENCOUNTERS
} from '@/lib/quest/encounters';
import { abilitiesForWorker, getPartyWorkers } from '@/lib/quest/party';
import type { BattleLogEntry, BattleState, CommandApiBattlePayload, Encounter } from '@/lib/quest/types';

const accentBorder: Record<IntelligenceWorker['accent'], string> = {
  cyan: 'border-cyan-400/50 ring-cyan-400/30',
  emerald: 'border-emerald-400/50 ring-emerald-400/30',
  amber: 'border-amber-400/50 ring-amber-400/30',
  rose: 'border-rose-400/50 ring-rose-400/30',
  violet: 'border-violet-400/50 ring-violet-400/30',
  blue: 'border-sky-400/50 ring-sky-400/30'
};

function logId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createNewGame(): { encounter: Encounter; battle: BattleState } {
  const encounter = pickRandomEncounter();
  return { encounter, battle: createInitialBattleState(encounter) };
}

export default function PulseQuestGame() {
  const party = useMemo(() => getPartyWorkers(), []);
  const [game, setGame] = useState(createNewGame);
  const encounter = game.encounter;
  const battle = game.battle;
  const [selectedWorkerId, setSelectedWorkerId] = useState(party[0]?.id ?? 'lead-scoring');
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWorker = party.find((worker) => worker.id === selectedWorkerId) ?? party[0];
  const abilities = abilitiesForWorker(selectedWorkerId);
  const encounterMeta = getEncounterById(battle.encounterId) ?? encounter;
  const enemyHpPercent = Math.max(0, Math.round((battle.enemyHp / encounterMeta.maxHp) * 100));
  const moralePercent = Math.max(0, battle.playerMorale);

  const restartEncounter = (nextEncounter: Encounter) => {
    setGame({ encounter: nextEncounter, battle: createInitialBattleState(nextEncounter) });
    setCommand('');
    setError(null);
    setRunning(false);
  };

  const submitTurn = async (commandText: string) => {
    if (!selectedWorker || battle.phase !== 'select' || running) return;
    const trimmed = commandText.trim();
    if (!trimmed) return;

    setRunning(true);
    setError(null);
    setGame((prev) => ({
      ...prev,
      battle: { ...prev.battle, phase: 'resolving' }
    }));

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed,
          selectedWorkerId: selectedWorker.id,
          relayMode: 'puppetshow',
          supervisor: false,
          context: { neighborhoodId: encounterMeta.id }
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Command Center refused the move.');
      }

      const apiPayload = payload as CommandApiBattlePayload;
      const resolution = resolveBattleTurn(
        selectedWorker,
        encounterMeta,
        trimmed,
        apiPayload,
        battle.turn
      );

      const playerDamage = computePlayerDamage(
        selectedWorker,
        encounterMeta,
        trimmed,
        apiPayload.result.summary
      );
      resolution.playerDamage = playerDamage;

      const enemyDamage = computeEnemyDamage(encounterMeta, battle.turn);
      resolution.enemyDamage = enemyDamage;

      const newEnemyHp = Math.max(0, battle.enemyHp - playerDamage.total);
      const newMorale = Math.max(0, battle.playerMorale - enemyDamage);

      const newLog: BattleLogEntry[] = [
        {
          id: logId(),
          kind: 'player',
          text: `${selectedWorker.name}: ${apiPayload.result.title}`,
          damage: playerDamage.total
        },
        {
          id: logId(),
          kind: 'narration',
          text: resolution.narration
        }
      ];

      if (newEnemyHp > 0 && newMorale > 0) {
        newLog.push({
          id: logId(),
          kind: 'enemy',
          text: `${encounterMeta.name} counters with market anxiety.`,
          damage: enemyDamage
        });
      }

      let nextPhase: BattleState['phase'] = 'select';
      if (newEnemyHp <= 0) {
        nextPhase = 'won';
        newLog.push({
          id: logId(),
          kind: 'system',
          text: encounterMeta.flavorDefeat
        });
      } else if (newMorale <= 0) {
        nextPhase = 'lost';
        newLog.push({
          id: logId(),
          kind: 'system',
          text: 'Broker morale collapsed. The CRM ate your afternoon.'
        });
      }

      setGame((prev) => ({
        ...prev,
        battle: {
          ...prev.battle,
          enemyHp: newEnemyHp,
          playerMorale: newMorale,
          turn: prev.battle.turn + 1,
          phase: nextPhase,
          log: [...prev.battle.log, ...newLog]
        }
      }));
      setCommand('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Turn failed.');
      setGame((prev) => ({ ...prev, battle: { ...prev.battle, phase: 'select' } }));
    } finally {
      setRunning(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitTurn(command);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]">
      <section className="border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/80">Active encounter</p>
            <h2 className="text-2xl font-black text-white">{encounterMeta.name}</h2>
            <p className="text-sm text-slate-400">{encounterMeta.title}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            Turn {battle.turn}
            <br />
            {battle.phase === 'won' ? 'Victory' : battle.phase === 'lost' ? 'Defeat' : 'In progress'}
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">{encounterMeta.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <HpBar label="Enemy HP" value={battle.enemyHp} max={encounterMeta.maxHp} percent={enemyHpPercent} tone="enemy" />
          <HpBar label="Broker morale" value={battle.playerMorale} max={100} percent={moralePercent} tone="player" />
        </div>

        <div className="mt-6 rounded border border-white/10 bg-[#0a1218] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Battle log</p>
          <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto text-sm">
            <AnimatePresence initial={false}>
              {battle.log.map((entry) => (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded px-2 py-1.5 ${
                    entry.kind === 'player'
                      ? 'bg-emerald-500/10 text-emerald-100'
                      : entry.kind === 'enemy'
                        ? 'bg-rose-500/10 text-rose-100'
                        : entry.kind === 'narration'
                          ? 'bg-violet-500/10 text-violet-100'
                          : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {entry.damage ? (
                    <span className="font-bold text-white">{entry.damage} dmg · </span>
                  ) : null}
                  {entry.text}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </section>

      <section className="border border-white/10 bg-black/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300/80">Party select</p>
        <div className="mt-3 grid gap-2">
          {party.map((worker) => {
            const Icon = worker.icon;
            const selected = worker.id === selectedWorkerId;
            return (
              <button
                key={worker.id}
                type="button"
                disabled={battle.phase !== 'select' || running}
                onClick={() => setSelectedWorkerId(worker.id)}
                className={`flex items-start gap-3 border p-3 text-left transition ${
                  selected
                    ? `ring-2 ${accentBorder[worker.accent]} bg-white/5`
                    : 'border-white/10 bg-black/20 hover:border-white/20'
                }`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                <div>
                  <p className="font-black text-white">{worker.name}</p>
                  <p className="text-xs text-slate-400">{worker.role}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    SPD {worker.stats.speed} · ACC {worker.stats.precision}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">Abilities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {abilities.map((ability) => (
              <button
                key={ability.id}
                type="button"
                disabled={battle.phase !== 'select' || running}
                onClick={() => {
                  setCommand(ability.command);
                  submitTurn(ability.command);
                }}
                className="border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-400/20 disabled:opacity-40"
              >
                {ability.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Broker command (routes through Command Center)
          </label>
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            disabled={battle.phase !== 'select' || running}
            rows={3}
            placeholder="Explain why this listing needs a price reset without panicking the seller..."
            className="w-full border border-white/15 bg-[#071013] p-3 text-sm text-white placeholder:text-slate-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={battle.phase !== 'select' || running || !command.trim()}
            className="flex w-full items-center justify-center gap-2 border border-cyan-400/40 bg-cyan-500/15 py-3 text-sm font-black uppercase tracking-wider text-cyan-100 disabled:opacity-40"
          >
            <Swords className="h-4 w-4" />
            {running ? 'Specialist casting...' : 'Execute turn'}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        {(battle.phase === 'won' || battle.phase === 'lost') && (
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => restartEncounter(pickRandomEncounter())}
              className="flex w-full items-center justify-center gap-2 border border-white/20 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
              Next encounter
            </button>
            <div className="flex flex-wrap gap-2">
              {STARTER_ENCOUNTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => restartEncounter(item)}
                  className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400 hover:text-white"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function HpBar({
  label,
  value,
  max,
  percent,
  tone
}: {
  label: string;
  value: number;
  max: number;
  percent: number;
  tone: 'enemy' | 'player';
}) {
  const barColor = tone === 'enemy' ? 'bg-rose-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
