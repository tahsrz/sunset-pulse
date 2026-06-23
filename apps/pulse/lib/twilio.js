import 'server-only';
import { sendTelnyxSMS } from '@/lib/messaging/telnyxClient';

export const twilioClient = {
  messages: {
    create: async ({ body, from, text, to }) => {
      const result = await sendTelnyxSMS(to, body || text || '', { from });

      if (!result.success) {
        throw new Error(result.error || result.reason || 'Telnyx message dispatch failed.');
      }

      return {
        id: result.messageId,
        sid: result.messageId,
      };
    },
  },
};

/**
 * Placeholder logic for RENTCAST/JAMIE integration
 * This will be expanded in the future.
 */
export const sendLeadAlert = async (leadData) => {
  // Logic to notify Taz about a high-probability lead
  console.log('Sending lead alert via Telnyx:', leadData);
  return { success: true };
};

/**
 * Sends a generic SMS text message via Telnyx.
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} body - Text content of the SMS
 */
export const sendSMS = async (to, body) => {
  const result = await sendTelnyxSMS(to, body);
  return result.messageId ? { ...result, sid: result.messageId } : result;
};

/**
 * Places an outbound voice call and reads a deterministic phone relay script.
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} script - Plain text script to read over the call
 */
export const placePhoneRelayCall = async (to, script) => {
  console.warn(`[TELNYX_CALL_SKIPPED]: Voice relay has not been migrated to Telnyx Call Control. Destination: ${to}. Script: "${script}"`);
  return {
    success: false,
    reason: 'Voice relay requires a Telnyx Call Control migration.',
    provider: 'telnyx',
  };
};

/**
 * Places an outbound voice call using a public callback URL that can collect keypad input.
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} twimlUrl - Public URL for provider call instructions
 * @param {string} [statusCallbackUrl] - Public URL for call lifecycle callbacks
 */
export const placeInteractivePhoneRelayCall = async (to, twimlUrl, statusCallbackUrl) => {
  console.warn(`[TELNYX_INTERACTIVE_CALL_SKIPPED]: Voice relay has not been migrated to Telnyx Call Control. Destination: ${to}. TwiML URL: "${twimlUrl}". Status callback: "${statusCallbackUrl || ''}"`);
  return {
    success: false,
    reason: 'Interactive voice relay requires a Telnyx Call Control migration.',
    provider: 'telnyx',
  };
};

/**
 * Formats and dispatches order alerts to the scheduled grill and register personnel
 * @param {object} order - Mongoose Order document
 * @param {string|null} grillPhone - Phone number of scheduled grill employee
 * @param {string|null} registerPhone - Phone number of scheduled register employee
 */
export const notifyStaffOfBurgerOrder = async (order, grillPhone, registerPhone) => {
  const itemsSummary = order.items
    .map((item) => `• ${item.quantity}x ${item.name}`)
    .join('\n');

  const messageBody = `🍔 [NEW BURGER ORDER] 🍔\nOrder ID: #${order._id.toString().slice(-6)}\nTotal: $${order.totalAmount.toFixed(2)}\n\nItems:\n${itemsSummary}\n\n🔥 Fire up the grill! 🔥`;

  const dispatches = [];

  if (grillPhone) {
    console.log(`[STAFF_ALERT]: Dispatching alert to Grill Employee at ${grillPhone}`);
    dispatches.push(sendSMS(grillPhone, `${messageBody}\n(Role: GRILL STAFF)`));
  } else {
    console.warn('[STAFF_ALERT]: No Grill Employee scheduled for today!');
  }

  if (registerPhone) {
    console.log(`[STAFF_ALERT]: Dispatching alert to Register Employee at ${registerPhone}`);
    dispatches.push(sendSMS(registerPhone, `${messageBody}\n(Role: REGISTER STAFF)`));
  } else {
    console.warn('[STAFF_ALERT]: No Register Employee scheduled for today!');
  }

  const results = await Promise.all(dispatches);
  return results;
};

/**
 * Formats a clean, high-impact SMS containing an employee's personal roster for the week
 * @param {string} employeeName
 * @param {Array<{day: string, role: string, time: string}>} shifts
 * @returns {string}
 */
export const formatWeeklyEmployeeSchedule = (employeeName, shifts) => {
  const shiftsSummary = shifts
    .map((s) => `• ${s.day}: ${s.role} (${s.time})`)
    .join('\n');
  return `📅 [YOUR WEEKLY SCHEDULE] 📅\nHello ${employeeName},\nHere are your scheduled shifts for the upcoming week:\n\n${shiftsSummary}\n\nHave a great week! 🌟`;
};

/**
 * Formats a master weekly schedule digest for the manager, highlighting unassigned slots
 * @param {string} rangeStr - e.g. "May 25 - May 31"
 * @param {Object} dailyRoster - Object mapping days of week to their scheduled roles
 * @returns {string}
 */
export const formatWeeklyMasterSchedule = (rangeStr, dailyRoster) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daySummaries = days.map((day) => {
    const grill = dailyRoster[day]?.grill || '⚠️ UNASSIGNED';
    const register = dailyRoster[day]?.register || '⚠️ UNASSIGNED';
    return `• ${day}:\n  - Grill: ${grill}\n  - Register: ${register}`;
  }).join('\n');

  return `📋 [MASTER WEEKLY SCHEDULE] 📋\nRange: ${rangeStr}\n\nShift Assignments:\n${daySummaries}`;
};

