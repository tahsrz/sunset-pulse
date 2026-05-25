/**
 * Timezone Hardening Helpers for Sunset Gas & Grill Operations Portal
 * Implements precision-calculated America/Chicago boundaries across any host local timezone (including serverless UTC).
 */

/**
 * Gets a Date object representing the current moment localized to America/Chicago.
 */
export function getChicagoToday(): Date {
  const chicagoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  return new Date(chicagoStr);
}

/**
 * Generates an absolute UTC Date representing a specific hour and minute on a target date's calendar day in America/Chicago.
 * Handles Daylight Saving Time offsets dynamically and accurately.
 */
export function chicagoDateTime(dateOrStr: Date | string, hour: number, minute: number = 0): Date {
  let chicagoDatePart: string;
  
  if (typeof dateOrStr === 'string') {
    const match = dateOrStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      chicagoDatePart = match[1];
    } else {
      const baseDate = new Date(dateOrStr);
      chicagoDatePart = baseDate.toLocaleDateString('sv-SE', { timeZone: 'America/Chicago' });
    }
  } else {
    chicagoDatePart = dateOrStr.toLocaleDateString('sv-SE', { timeZone: 'America/Chicago' });
  }
  
  const localIso = `${chicagoDatePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  // 1. Parse local date-time string as if it were UTC
  const tempUtc = new Date(localIso + 'Z');
  
  // 2. Measure difference between formatted local time string and UTC time string for this exact UTC moment
  const chicagoStr = tempUtc.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const utcStr = tempUtc.toLocaleString('en-US', { timeZone: 'UTC' });
  
  const diffMs = new Date(chicagoStr).getTime() - new Date(utcStr).getTime();
  
  // 3. Shift the UTC time by the difference to resolve to correct absolute UTC Date
  return new Date(tempUtc.getTime() - diffMs);
}

/**
 * Calculates a week range boundaries (Monday 00:00:00.000 to Sunday 23:59:59.999) localized in America/Chicago.
 * 
 * @param weekOffset Offset relative to active reference week.
 * @param referenceNextMonday If true, references "next Monday" (default for predictive approval), otherwise "current Monday".
 */
export function getChicagoWeekRange(weekOffset: number, referenceNextMonday: boolean = false): { start: Date, end: Date } {
  const todayInChicago = getChicagoToday();
  const currentDay = todayInChicago.getDay(); // 0 is Sunday, 1 is Monday...
  
  let daysToRefMonday = 0;
  if (referenceNextMonday) {
    // Days to next Monday
    daysToRefMonday = currentDay === 0 ? 1 : 8 - currentDay;
  } else {
    // Days to Monday of current week
    daysToRefMonday = currentDay === 0 ? -6 : 1 - currentDay;
  }
  
  const targetMonday = new Date(todayInChicago);
  const targetOffsetDays = daysToRefMonday + (referenceNextMonday ? (weekOffset - 1) * 7 : weekOffset * 7);
  targetMonday.setDate(todayInChicago.getDate() + targetOffsetDays);
  
  const start = chicagoDateTime(targetMonday, 0, 0);
  
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  const end = chicagoDateTime(targetSunday, 23, 59);
  end.setSeconds(59, 999);
  
  return { start, end };
}
