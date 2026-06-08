export type BurgerSauce = 'mayo' | 'mustard' | string;
export type BurgerVegetable = 'pickles' | 'lettuce' | 'onions' | 'tomato' | string;

export interface BurgerCustomization {
  sauces?: BurgerSauce[];
  vegetables?: BurgerVegetable[];
  allTheWay?: boolean;
  removedVegetables?: BurgerVegetable[];
}

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  customization?: BurgerCustomization;
}

export interface Order {
  items: CartItem[];
  ticket: string;
}

export interface GeneratedCallScript {
  script: string;
  madeDifferent: boolean;
  confirmation: string;
}

interface NormalizedLineItem {
  sequence: number;
  name: string;
  sauces: string[];
  vegetables: string[];
  removed: string[];
}

const ALL_THE_WAY_VEGETABLES = ['pickles', 'lettuce', 'onions', 'tomato'];
const BURGER_SAUCES = ['mayo', 'mustard'];

export const DEFAULT_BURGER_CUSTOMIZATION: BurgerCustomization = {
  allTheWay: true,
};

export function buildDefaultBurgerCustomization(notes = ''): BurgerCustomization {
  const removedVegetables = parseRemovedVegetables(notes);
  const sauces = parseRequestedSauces(notes);

  return {
    allTheWay: true,
    ...(sauces.length > 0 ? { sauces } : {}),
    ...(removedVegetables.length > 0 ? { removedVegetables } : {}),
  };
}

export function generateEmployeeTicket(cartItems: CartItem[]): Order {
  const items = normalizeCartItems(cartItems);
  const lines = [`ORDER: ${formatOrderSummary(items)}`, ''];

  items.forEach((item) => {
    lines.push(`#${item.sequence} ${item.name}`);
    lines.push(`Sauce: ${formatTitleList(item.sauces) || 'None'}`);
    lines.push(`Vegetables: ${formatTitleList(item.vegetables) || 'None'}`);

    if (item.removed.length > 0) {
      lines.push(`Removed: ${formatTitleList(item.removed)}`);
    }

    lines.push('');
  });

  return {
    items: cartItems,
    ticket: lines.join('\n').trimEnd(),
  };
}

export function generatePhoneCallScript(cartItems: CartItem[], callerName = 'Jamie'): GeneratedCallScript {
  const items = normalizeCartItems(cartItems);
  const madeDifferent = hasSameItemWithDifferentCustomizations(items);
  const orderSummary = formatSpokenOrderSummary(items);
  const opening = `Hi, this is ${callerName}, an automated order assistant calling in a pickup order.`;
  const readiness = 'Are you ready for the order?';
  const itemIntro = `Thank you. The order is ${orderSummary}${madeDifferent ? '. They are made different' : ''}.`;
  const itemLines = items.flatMap((item, index) => {
    const lines = [
      `${ordinal(index + 1)} ${item.name.toLowerCase()}:`,
      `Sauce: ${formatSpokenList(item.sauces)}.`,
      `Vegetables: ${formatSpokenList(item.vegetables)}.`,
    ];

    if (item.removed.length > 0) {
      lines.push(`No ${formatSpokenList(item.removed)}.`);
    }

    return lines;
  });
  const confirmation = [
    `Please read that back when you are ready.`,
    `It should be ${orderSummary}.`,
    ...items.map((item, index) => `${ordinal(index + 1)} one: ${formatConfirmationDetails(item)}.`),
    `If anything sounded unclear, I can repeat it.`,
  ].join('\n');

  return {
    script: [opening, readiness, '', itemIntro, '', itemLines.join('\n'), '', confirmation].join('\n'),
    madeDifferent,
    confirmation,
  };
}

function normalizeCartItems(cartItems: CartItem[]): NormalizedLineItem[] {
  const items: NormalizedLineItem[] = [];

  cartItems.forEach((item) => {
    const quantity = Math.max(1, item.quantity || 1);
    for (let count = 0; count < quantity; count += 1) {
      items.push({
        sequence: items.length + 1,
        name: item.name,
        ...normalizeCustomization(item.customization),
      });
    }
  });

  return items;
}

function normalizeCustomization(customization: BurgerCustomization = {}) {
  const removed = uniqueLowercase(customization.removedVegetables || []);
  const vegetables = customization.allTheWay
    ? ALL_THE_WAY_VEGETABLES
    : uniqueLowercase(customization.vegetables || []);

  return {
    sauces: uniqueLowercase(customization.sauces || []),
    vegetables: vegetables.filter((vegetable) => !removed.includes(vegetable)),
    removed,
  };
}

function hasSameItemWithDifferentCustomizations(items: NormalizedLineItem[]) {
  const byName = new Map<string, Set<string>>();

  items.forEach((item) => {
    const key = item.name.toLowerCase();
    const customizations = byName.get(key) || new Set<string>();
    customizations.add(JSON.stringify({
      sauces: item.sauces,
      vegetables: item.vegetables,
      removed: item.removed,
    }));
    byName.set(key, customizations);
  });

  return Array.from(byName.values()).some((customizations) => customizations.size > 1);
}

function formatOrderSummary(items: NormalizedLineItem[]) {
  const counts = countByName(items);
  return Array.from(counts.entries())
    .map(([name, count]) => `${count} ${pluralize(name, count)}`)
    .join(', ');
}

function formatSpokenOrderSummary(items: NormalizedLineItem[]) {
  const counts = countByName(items);
  return Array.from(counts.entries())
    .map(([name, count]) => `${numberWord(count)} ${pluralize(name, count).toLowerCase()}`)
    .join(', ');
}

function countByName(items: NormalizedLineItem[]) {
  return items.reduce((counts, item) => {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function uniqueLowercase(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function parseRemovedVegetables(notes: string) {
  const normalized = notes.toLowerCase();

  if (/\b(plain|no\s+(vegetables|veggies|produce))\b/.test(normalized)) {
    return ALL_THE_WAY_VEGETABLES;
  }

  return ALL_THE_WAY_VEGETABLES.filter((vegetable) => {
    const singular = vegetable.endsWith('s') ? vegetable.slice(0, -1) : vegetable;
    const pattern = new RegExp(`\\b(no|without|hold|remove)\\s+${singular}s?\\b`);
    return pattern.test(normalized);
  });
}

function parseRequestedSauces(notes: string) {
  const normalized = notes.toLowerCase();

  return BURGER_SAUCES.filter((sauce) => {
    const positivePattern = new RegExp(`\\b${sauce}\\b`);
    const negativePattern = new RegExp(`\\b(no|without|hold|remove)\\s+${sauce}\\b`);
    return positivePattern.test(normalized) && !negativePattern.test(normalized);
  });
}

function formatTitleList(values: string[]) {
  return values.map(titleCase).join(', ');
}

function formatSpokenList(values: string[]) {
  if (values.length === 0) return 'none';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function formatConfirmationDetails(item: NormalizedLineItem) {
  const details = [
    formatSpokenList(item.sauces),
    item.removed.length > 0 ? item.vegetables.join(', ') : formatSpokenList(item.vegetables),
  ];

  if (item.removed.length > 0) {
    details.push(`no ${formatSpokenList(item.removed)}`);
  }

  return details.join(', ');
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralize(name: string, count: number) {
  if (count === 1) return name;
  if (name.endsWith('s')) return name;
  return `${name}s`;
}

function ordinal(value: number) {
  const words: Record<number, string> = {
    1: 'First',
    2: 'Second',
    3: 'Third',
    4: 'Fourth',
    5: 'Fifth',
  };

  return words[value] || `Item ${value}`;
}

function numberWord(value: number) {
  const words: Record<number, string> = {
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
  };

  return words[value] || String(value);
}
