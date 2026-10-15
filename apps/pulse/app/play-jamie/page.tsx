import type { Metadata } from 'next';
import Link from 'next/link';
import { Crown, Gamepad2, Layers3, Spade, Waves } from 'lucide-react';
import { JamieLocalScorecard } from '@/components/jamie-games/JamieLocalScorecard';
import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import styles from '@/components/realtor/Fieldbook.module.css';

export const metadata: Metadata = {
  title: 'Play Jamie | Sunset Pulse',
  description: 'Play local games with Jamie, view your browser records, or launch Crash Bash Online for solo and multiplayer rounds.',
};
const games = [
  { href: '/play-jamie/chess', name: 'Chess', Icon: Crown, detail: 'Legal moves, promotion, undo and move history.', action: 'Play chess' },
  { href: '/play-jamie/tetris', name: 'Block Drop', Icon: Layers3, detail: 'Falling blocks, levels and local high scores.', action: 'Play Block Drop' },
  { href: '/play-jamie/poker', name: 'Texas Hold’em', Icon: Spade, detail: 'Heads-up poker with virtual chips.', action: 'Play poker' },
  { href: '/play-jamie/volley', name: 'Sunset Volley', Icon: Waves, detail: 'Beach volleyball against Jamie.', action: 'Play Sunset Volley' },
  { href: '/play-jamie/crash-bash', name: 'Crash Bash Online', Icon: Gamepad2, detail: 'External game. Accounts and records are separate.', action: 'Open launch guide' },
];
export default function PlayJamiePage() {
  return <FieldbookShell title="Play Jamie">
    <div className={styles.games}>
      <div>{games.map(({ href, name, Icon, detail, action }) => <article key={href} className={styles.game}>
        <Icon size={24} aria-hidden="true" />
        <div><h2>{name}</h2><p>{detail}</p></div>
        <Link href={href}>{action}</Link>
      </article>)}</div>
      <aside className={styles.margin}><JamieLocalScorecard /></aside>
    </div>
  </FieldbookShell>;
}
