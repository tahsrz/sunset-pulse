export const MINIMUM_ORDER_WAIT_MINUTES = 15;
export const WAIT_MINUTES_PER_ITEM = 4;

export function calculateOrderItemCount(items: Array<{ quantity?: number }> = []) {
  return items.reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
}

export function calculateEstimatedWaitMinutes(items: Array<{ quantity?: number }> = []) {
  const itemCount = calculateOrderItemCount(items);
  return Math.max(MINIMUM_ORDER_WAIT_MINUTES, itemCount * WAIT_MINUTES_PER_ITEM);
}

export function calculateEstimatedReadyAt(startTime: Date, items: Array<{ quantity?: number }> = []) {
  return new Date(startTime.getTime() + calculateEstimatedWaitMinutes(items) * 60 * 1000);
}
