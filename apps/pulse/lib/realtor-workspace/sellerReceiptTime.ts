import { possibleUtcInstantsForLocalDateTime } from './progress';

export function sellerReceiptTime(localTime: string, timeZone: string, repeatedHour: '' | 'earlier' | 'later', createdAt: string, now = Date.now()) {
  if (!localTime) return new Date(now).toISOString();
  const instants = possibleUtcInstantsForLocalDateTime(localTime, timeZone);
  if (!instants.length) throw new Error('That local time does not exist. Choose another time.');
  if (instants.length > 1 && !repeatedHour) throw new Error('Choose which occurrence of the repeated local time the action happened in.');
  const instant = instants[repeatedHour === 'later' ? instants.length - 1 : 0];
  if (instant.getTime() > now + 5 * 60_000 || instant.getTime() < Date.parse(createdAt) - 5 * 60_000) {
    throw new Error('The action time must be after the seller request and no more than five minutes in the future.');
  }
  return instant.toISOString();
}
