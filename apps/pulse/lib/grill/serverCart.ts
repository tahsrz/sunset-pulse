import MenuItem from '@/models/MenuItem';

type ClientCartItem = {
  id?: string;
  _id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  discountEligible?: boolean;
  instructions?: string;
  customization?: {
    sauces?: string[];
    vegetables?: string[];
    allTheWay?: boolean;
    removedVegetables?: string[];
    selectedOptions?: Record<string, unknown>;
  };
};

type CatalogMenuItem = {
  _id?: unknown;
  id?: string;
  name: string;
  price: number;
  isAvailable?: boolean;
};

const DELIVERY_FEE_ID = 'delivery-fee';
const DELIVERY_FEE_NAME = 'Mailbox Delivery Fee';
const DELIVERY_FEE_PRICE = 10;
const MAX_LINE_QUANTITY = 20;
const MAX_INSTRUCTION_LENGTH = 240;

function itemId(item: ClientCartItem | CatalogMenuItem) {
  return String(item._id || item.id || '').trim();
}

function sanitizeQuantity(quantity: unknown) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.floor(parsed));
}

function sanitizeStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];

  return Array.from(new Set(
    values
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12),
  ));
}

function sanitizeCustomization(customization: ClientCartItem['customization']) {
  if (!customization || typeof customization !== 'object') return undefined;

  return {
    sauces: sanitizeStringArray(customization.sauces),
    vegetables: sanitizeStringArray(customization.vegetables),
    allTheWay: Boolean(customization.allTheWay),
    removedVegetables: sanitizeStringArray(customization.removedVegetables),
    selectedOptions: sanitizeSelectedOptions(customization.selectedOptions),
  };
}

function sanitizeSelectedOptions(selectedOptions: unknown) {
  if (!selectedOptions || typeof selectedOptions !== 'object' || Array.isArray(selectedOptions)) return {};

  return Object.fromEntries(
    Object.entries(selectedOptions)
      .map(([key, value]) => [
        String(key || '').trim().slice(0, 40),
        String(value || '').trim().slice(0, 80),
      ])
      .filter(([key, value]) => key && value),
  );
}

function sanitizeInstructions(instructions: unknown) {
  const value = String(instructions || '').trim();
  if (!value) return undefined;
  return value.slice(0, MAX_INSTRUCTION_LENGTH);
}

export function sanitizeCartItemsWithCatalog(items: ClientCartItem[] = [], catalog: CatalogMenuItem[] = []) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must include at least one item.');
  }

  const catalogById = new Map(catalog.map((item) => [itemId(item), item]));

  return items.map((item) => {
    const id = itemId(item);
    const quantity = sanitizeQuantity(item.quantity);

    if (id === DELIVERY_FEE_ID) {
      return {
        id: DELIVERY_FEE_ID,
        name: DELIVERY_FEE_NAME,
        price: DELIVERY_FEE_PRICE,
        quantity,
        discountEligible: false,
      };
    }

    const menuItem = catalogById.get(id);
    if (!menuItem) {
      throw new Error(`Menu item is unavailable or invalid: ${id || item.name || 'unknown item'}.`);
    }

    if (menuItem.isAvailable === false) {
      throw new Error(`Menu item is unavailable: ${menuItem.name}.`);
    }

    return {
      id,
      name: menuItem.name,
      price: Number(menuItem.price),
      quantity,
      customization: sanitizeCustomization(item.customization),
      instructions: sanitizeInstructions(item.instructions),
    };
  });
}

export async function resolveCartItemsFromMenu(items: ClientCartItem[] = []) {
  const ids = Array.from(new Set(
    items
      .map(itemId)
      .filter((id) => id && id !== DELIVERY_FEE_ID),
  ));

  const catalog = ids.length > 0
    ? await MenuItem.find({ _id: { $in: ids }, isAvailable: true }).lean()
    : [];

  return sanitizeCartItemsWithCatalog(items, catalog);
}
