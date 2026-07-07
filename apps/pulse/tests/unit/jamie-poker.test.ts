import { describe, expect, it } from 'vitest';
import {
  comparePokerHands,
  createPokerDeck,
  createPokerGame,
  evaluateBestPokerHand,
  getSuggestedPokerBet,
  humanPokerAction,
  type PokerCard,
} from '@/lib/jamie-games/poker';

const card = (rank: PokerCard['rank'], suit: PokerCard['suit']): PokerCard => ({ rank, suit });

describe('Play Jamie poker engine', () => {
  it('creates a full unique deck', () => {
    const deck = createPokerDeck();

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((item) => `${item.rank}-${item.suit}`))).toHaveLength(52);
  });

  it('evaluates the strongest Texas Hold em hand from seven cards', () => {
    const best = evaluateBestPokerHand([
      card('A', 'hearts'),
      card('K', 'hearts'),
      card('Q', 'hearts'),
      card('J', 'hearts'),
      card('10', 'hearts'),
      card('2', 'clubs'),
      card('3', 'diamonds'),
    ]);

    expect(best.label).toBe('royal flush');
    expect(best.category).toBe(8);
  });

  it('uses kickers to break equal hand categories', () => {
    const acePair = evaluateBestPokerHand([
      card('A', 'hearts'),
      card('A', 'clubs'),
      card('K', 'spades'),
      card('9', 'diamonds'),
      card('4', 'clubs'),
    ]);
    const acePairLowerKicker = evaluateBestPokerHand([
      card('A', 'diamonds'),
      card('A', 'spades'),
      card('Q', 'clubs'),
      card('9', 'clubs'),
      card('4', 'hearts'),
    ]);

    expect(comparePokerHands(acePair, acePairLowerKicker)).toBeGreaterThan(0);
  });

  it('lets a human bet force a Jamie fold and awards the pot', () => {
    const game = createPokerGame({
      deck: [
        card('A', 'hearts'),
        card('2', 'clubs'),
        card('A', 'diamonds'),
        card('7', 'spades'),
      ],
    });
    const result = humanPokerAction(game, 'bet', () => 0);

    expect(result.status).toBe('hand-over');
    expect(result.lastWinner).toBe('human');
    expect(result.stacks.human).toBeGreaterThan(game.stacks.human);
  });

  it('advances to the flop after both players check', () => {
    const game = createPokerGame({
      deck: [
        card('2', 'spades'),
        card('3', 'clubs'),
        card('4', 'diamonds'),
        card('7', 'hearts'),
        card('K', 'clubs'),
        card('8', 'spades'),
        card('9', 'diamonds'),
        card('10', 'hearts'),
      ],
    });
    const result = humanPokerAction(game, 'check', () => 0.99);

    expect(result.stage).toBe('flop');
    expect(result.community).toHaveLength(3);
    expect(getSuggestedPokerBet(result)).toBeGreaterThan(getSuggestedPokerBet(game));
  });
});
