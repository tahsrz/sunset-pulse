export const POKER_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const POKER_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export type PokerSuit = typeof POKER_SUITS[number];
export type PokerRank = typeof POKER_RANKS[number];

export type PokerCard = {
  rank: PokerRank;
  suit: PokerSuit;
};

export type PokerStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PokerPlayer = 'human' | 'jamie';
export type PokerAction = 'check' | 'call' | 'bet' | 'fold';
export type PokerWinner = PokerPlayer | 'tie';
export type RandomSource = () => number;

export type PokerHandRank = {
  category: number;
  label: string;
  values: number[];
};

export type PokerShowdown = {
  human: PokerHandRank;
  jamie: PokerHandRank;
  winner: PokerWinner;
};

export type PokerGameState = {
  deck: PokerCard[];
  humanHole: PokerCard[];
  jamieHole: PokerCard[];
  community: PokerCard[];
  stage: PokerStage;
  status: 'playing' | 'hand-over';
  pot: number;
  toCall: number;
  stacks: Record<PokerPlayer, number>;
  handNumber: number;
  lastWinner: PokerWinner | null;
  lastShowdown: PokerShowdown | null;
  message: string;
  log: string[];
};

export type PokerGameOptions = {
  random?: RandomSource;
  deck?: PokerCard[];
  stacks?: Partial<Record<PokerPlayer, number>>;
  handNumber?: number;
};

const STARTING_STACK = 1_000;
const ANTE = 10;
const RANK_VALUE: Record<PokerRank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const STAGE_LABEL: Record<PokerStage, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
};

export function createPokerDeck(): PokerCard[] {
  return POKER_SUITS.flatMap((suit) => POKER_RANKS.map((rank) => ({ rank, suit })));
}

export function shufflePokerDeck(deck: PokerCard[] = createPokerDeck(), random: RandomSource = Math.random) {
  const next = [...deck];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function createPokerGame(options: PokerGameOptions = {}): PokerGameState {
  const random = options.random ?? Math.random;
  const deck = options.deck ? normalizeDeck(options.deck) : shufflePokerDeck(createPokerDeck(), random);
  const stacks = {
    human: Math.max(0, options.stacks?.human ?? STARTING_STACK),
    jamie: Math.max(0, options.stacks?.jamie ?? STARTING_STACK),
  };
  const humanAnte = Math.min(ANTE, stacks.human);
  const jamieAnte = Math.min(ANTE, stacks.jamie);
  const [humanFirst, jamieFirst, humanSecond, jamieSecond, ...rest] = deck;

  return {
    deck: rest,
    humanHole: [humanFirst, humanSecond],
    jamieHole: [jamieFirst, jamieSecond],
    community: [],
    stage: 'preflop',
    status: 'playing',
    pot: humanAnte + jamieAnte,
    toCall: 0,
    stacks: {
      human: stacks.human - humanAnte,
      jamie: stacks.jamie - jamieAnte,
    },
    handNumber: options.handNumber ?? 1,
    lastWinner: null,
    lastShowdown: null,
    message: 'Cards are out. Jamie antes up and watches your first move.',
    log: [`Hand ${options.handNumber ?? 1}: both players ante ${ANTE}.`],
  };
}

export function startNextPokerHand(state: PokerGameState, random: RandomSource = Math.random) {
  const bothPlayersCanContinue = state.stacks.human > 0 && state.stacks.jamie > 0;
  return createPokerGame({
    random,
    stacks: bothPlayersCanContinue ? state.stacks : { human: STARTING_STACK, jamie: STARTING_STACK },
    handNumber: state.handNumber + 1,
  });
}

export function getSuggestedPokerBet(state: PokerGameState) {
  const streetPremium = state.stage === 'preflop' ? 0 : state.community.length * 10;
  return Math.min(state.stacks.human, 50 + streetPremium);
}

export function humanPokerAction(
  state: PokerGameState,
  action: PokerAction,
  random: RandomSource = Math.random
): PokerGameState {
  if (state.status === 'hand-over') return state;

  if (action === 'fold') {
    return awardPokerPot(state, 'jamie', 'You fold. Jamie pulls in the pot with the calm of someone who definitely had notes.');
  }

  if (state.toCall > 0) {
    if (action !== 'call') {
      return { ...state, message: `Jamie has ${state.toCall} on the table. Call or fold to continue.` };
    }

    const callAmount = Math.min(state.toCall, state.stacks.human);
    const called = withChipTransfer(state, 'human', callAmount, {
      toCall: 0,
      message: `You call ${callAmount}. Jamie gives the felt a tiny approving nod.`,
      log: [...state.log, `You call ${callAmount}.`],
    });
    return advancePokerStreet(called, `You call ${callAmount}.`);
  }

  if (action === 'call') {
    return { ...state, message: 'Nothing to call yet. You can check or make the first bet.' };
  }

  if (action === 'bet') {
    const betAmount = getSuggestedPokerBet(state);
    if (betAmount <= 0) return advancePokerStreet(state, 'You check all-in.');
    const afterBet = withChipTransfer(state, 'human', betAmount, {
      message: `You bet ${betAmount}. Jamie counts the story, not just the chips.`,
      log: [...state.log, `You bet ${betAmount}.`],
    });
    return resolveJamieFacingBet(afterBet, betAmount, random);
  }

  return resolveJamieAfterCheck(state, random);
}

export function evaluateBestPokerHand(cards: PokerCard[]): PokerHandRank {
  if (cards.length < 5) throw new Error('At least five cards are required to evaluate a poker hand.');
  return getFiveCardCombinations(cards).reduce<PokerHandRank | null>((best, hand) => {
    const rank = evaluateFiveCardHand(hand);
    return !best || comparePokerHands(rank, best) > 0 ? rank : best;
  }, null)!;
}

export function comparePokerHands(a: PokerHandRank, b: PokerHandRank) {
  if (a.category !== b.category) return a.category - b.category;
  const length = Math.max(a.values.length, b.values.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a.values[index] ?? 0) - (b.values[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function getPokerStageLabel(stage: PokerStage) {
  return STAGE_LABEL[stage];
}

export function formatPokerCard(card: PokerCard) {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

export function getSuitSymbol(suit: PokerSuit) {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
  }
}

export function getJamiePokerCommentary(state: PokerGameState) {
  if (state.status === 'hand-over') {
    if (state.lastWinner === 'human') return 'You dragged that pot like you had a closing scheduled at 4:30.';
    if (state.lastWinner === 'jamie') return 'I am not saying I read your soul. I am saying your bet sizing used a readable font.';
    return 'A chopped pot. Democracy, but with more tension.';
  }
  if (state.toCall > 0) return `Jamie has ${state.toCall} out there. This is where math and vibes file a joint memo.`;
  if (state.stage === 'river') return 'River card is live. No more streets after this, just truth and accounting.';
  if (state.stage === 'turn') return 'The turn is where confidence starts charging interest.';
  if (state.stage === 'flop') return 'Three cards up. Suddenly everyone has a theory.';
  return 'Preflop is mostly discipline wearing sunglasses.';
}

function normalizeDeck(deck: PokerCard[]) {
  const seen = new Set<string>();
  const supplied = deck.filter((card) => {
    const key = `${card.rank}-${card.suit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rest = createPokerDeck().filter((card) => !seen.has(`${card.rank}-${card.suit}`));
  return [...supplied, ...rest];
}

function withChipTransfer(
  state: PokerGameState,
  player: PokerPlayer,
  amount: number,
  patch: Partial<PokerGameState> = {}
): PokerGameState {
  return {
    ...state,
    ...patch,
    pot: state.pot + amount,
    stacks: {
      ...state.stacks,
      [player]: state.stacks[player] - amount,
    },
  };
}

function resolveJamieAfterCheck(state: PokerGameState, random: RandomSource): PokerGameState {
  const confidence = estimateJamieConfidence(state);
  const shouldBet = state.stacks.jamie > 0 && (confidence >= 0.68 || random() < 0.18);

  if (shouldBet) {
    const betAmount = Math.min(state.stacks.jamie, getJamieBetAmount(state, confidence));
    return withChipTransfer(state, 'jamie', betAmount, {
      toCall: betAmount,
      message: `You check. Jamie bets ${betAmount}.`,
      log: [...state.log, `You check. Jamie bets ${betAmount}.`],
    });
  }

  return advancePokerStreet({
    ...state,
    message: 'You check. Jamie checks behind.',
    log: [...state.log, 'You check. Jamie checks.'],
  }, 'Both players check.');
}

function resolveJamieFacingBet(state: PokerGameState, betAmount: number, random: RandomSource): PokerGameState {
  const confidence = estimateJamieConfidence(state);
  const potOddsPressure = betAmount / Math.max(1, state.pot);
  const willCall = confidence + random() * 0.28 >= 0.42 + potOddsPressure * 0.18;

  if (!willCall) {
    return awardPokerPot(state, 'human', `Jamie folds to your ${betAmount}. The pot slides your way.`);
  }

  const callAmount = Math.min(betAmount, state.stacks.jamie);
  const called = withChipTransfer(state, 'jamie', callAmount, {
    message: `Jamie calls ${callAmount}.`,
    log: [...state.log, `Jamie calls ${callAmount}.`],
  });
  return advancePokerStreet(called, `Jamie calls ${callAmount}.`);
}

function advancePokerStreet(state: PokerGameState, leadMessage: string): PokerGameState {
  if (state.stage === 'river') return settlePokerShowdown(state);

  const cardsToReveal = state.stage === 'preflop' ? 3 : 1;
  const [, ...afterBurn] = state.deck;
  const nextCommunity = [...state.community, ...afterBurn.slice(0, cardsToReveal)];
  const nextDeck = afterBurn.slice(cardsToReveal);
  const nextStage = state.stage === 'preflop' ? 'flop' : state.stage === 'flop' ? 'turn' : 'river';

  return {
    ...state,
    deck: nextDeck,
    community: nextCommunity,
    stage: nextStage,
    toCall: 0,
    message: `${leadMessage} ${STAGE_LABEL[nextStage]} is on the board.`,
    log: [...state.log, `${STAGE_LABEL[nextStage]}: ${nextCommunity.map(formatPokerCard).join(' ')}`],
  };
}

function settlePokerShowdown(state: PokerGameState): PokerGameState {
  const human = evaluateBestPokerHand([...state.humanHole, ...state.community]);
  const jamie = evaluateBestPokerHand([...state.jamieHole, ...state.community]);
  const comparison = comparePokerHands(human, jamie);
  const winner: PokerWinner = comparison > 0 ? 'human' : comparison < 0 ? 'jamie' : 'tie';
  const showdown: PokerShowdown = { human, jamie, winner };

  if (winner === 'tie') {
    const halfPot = Math.floor(state.pot / 2);
    return {
      ...state,
      stage: 'showdown',
      status: 'hand-over',
      pot: 0,
      toCall: 0,
      lastWinner: winner,
      lastShowdown: showdown,
      stacks: {
        human: state.stacks.human + halfPot,
        jamie: state.stacks.jamie + state.pot - halfPot,
      },
      message: `Showdown: both players chop with ${human.label}.`,
      log: [...state.log, `Showdown: chopped pot with ${human.label}.`],
    };
  }

  return awardPokerPot({
    ...state,
    stage: 'showdown',
    lastShowdown: showdown,
  }, winner, `Showdown: ${winner === 'human' ? 'you win' : 'Jamie wins'} with ${winner === 'human' ? human.label : jamie.label}.`);
}

function awardPokerPot(state: PokerGameState, winner: PokerPlayer, message: string): PokerGameState {
  return {
    ...state,
    status: 'hand-over',
    pot: 0,
    toCall: 0,
    lastWinner: winner,
    stacks: {
      ...state.stacks,
      [winner]: state.stacks[winner] + state.pot,
    },
    message,
    log: [...state.log, message],
  };
}

function estimateJamieConfidence(state: PokerGameState) {
  const holeValues = state.jamieHole.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
  const suited = state.jamieHole[0]?.suit === state.jamieHole[1]?.suit;
  const paired = holeValues[0] === holeValues[1];

  if (state.community.length >= 3) {
    const best = evaluateBestPokerHand([...state.jamieHole, ...state.community]);
    return Math.min(0.96, best.category * 0.13 + best.values[0] / 20 + (suited ? 0.03 : 0));
  }

  if (paired) return Math.min(0.9, 0.52 + holeValues[0] / 30);
  return Math.min(0.82, holeValues[0] / 20 + (suited ? 0.08 : 0) + (Math.abs(holeValues[0] - holeValues[1]) <= 2 ? 0.06 : 0));
}

function getJamieBetAmount(state: PokerGameState, confidence: number) {
  const base = state.stage === 'preflop' ? 40 : 55 + state.community.length * 10;
  return Math.max(20, Math.round(base * (confidence > 0.82 ? 1.35 : 1)));
}

function evaluateFiveCardHand(cards: PokerCard[]): PokerHandRank {
  const values = cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
  const counts = values.reduce<Map<number, number>>((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map());
  const groups = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh) return { category: 8, label: straightHigh === 14 ? 'royal flush' : 'straight flush', values: [straightHigh] };
  if (groups[0].count === 4) return { category: 7, label: 'four of a kind', values: [groups[0].value, groups[1].value] };
  if (groups[0].count === 3 && groups[1].count === 2) return { category: 6, label: 'full house', values: [groups[0].value, groups[1].value] };
  if (flush) return { category: 5, label: 'flush', values };
  if (straightHigh) return { category: 4, label: 'straight', values: [straightHigh] };
  if (groups[0].count === 3) {
    return { category: 3, label: 'three of a kind', values: [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)] };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.value).sort((a, b) => b - a);
    const kicker = groups.find((group) => group.count === 1)!.value;
    return { category: 2, label: 'two pair', values: [...pairs, kicker] };
  }
  if (groups[0].count === 2) {
    return { category: 1, label: 'one pair', values: [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)] };
  }
  return { category: 0, label: 'high card', values };
}

function getStraightHigh(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const run = unique.slice(index, index + 5);
    if (run.every((value, offset) => offset === 0 || value === run[offset - 1] - 1)) {
      return run[0] === 1 ? 5 : run[0];
    }
  }
  return 0;
}

function getFiveCardCombinations(cards: PokerCard[]) {
  const combinations: PokerCard[][] = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            combinations.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }
  return combinations;
}
