import 'server-only';
import { getTelnyxClient, sendTelnyxSMS } from '@/lib/messaging/telnyxClient';

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

function getTelnyxVoiceConfig() {
  const connectionId = process.env.TELNYX_CONNECTION_ID || process.env.TELNYX_CALL_CONTROL_APP_ID;
  const from = process.env.TELNYX_FROM_NUMBER;

  if (!process.env.TELNYX_API_KEY || !connectionId || !from) {
    return {
      configured: false,
      reason: 'Missing TELNYX_API_KEY, TELNYX_FROM_NUMBER, or TELNYX_CONNECTION_ID.',
    };
  }

  return {
    configured: true,
    connectionId,
    from,
  };
}

function encodeClientState(state) {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

async function placeTelnyxOutboundCall(to, clientState) {
  const config = getTelnyxVoiceConfig();

  if (!config.configured) {
    console.warn(`[TELNYX_CALL_SKIPPED]: ${config.reason} Destination: ${to}.`);
    return {
      success: false,
      reason: config.reason,
      provider: 'telnyx',
    };
  }

  try {
    const response = await getTelnyxClient().calls.dial({
      connection_id: config.connectionId,
      from: config.from,
      to,
      client_state: encodeClientState(clientState),
      answering_machine_detection: 'disabled',
    });

    const call = response.data;
    console.log(`[TELNYX_CALL_DIALED]: Call leg ${call?.call_leg_id || 'unknown'} to ${to}`);

    return {
      success: true,
      provider: 'telnyx',
      id: call?.call_control_id,
      sid: call?.call_control_id,
      callControlId: call?.call_control_id,
      callLegId: call?.call_leg_id,
      callSessionId: call?.call_session_id,
    };
  } catch (error) {
    console.error('[TELNYX_CALL_ERROR]:', {
      status: error.statusCode,
      message: error.message,
      raw: error.rawBody,
    });

    return {
      success: false,
      provider: 'telnyx',
      error: error.message,
    };
  }
}

/**
 * Places an outbound voice call and reads a deterministic phone relay script.
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} script - Plain text script to read over the call
 */
export const placePhoneRelayCall = async (to, script, options = {}) => {
  return placeTelnyxOutboundCall(to, {
    kind: 'order-relay',
    interactive: false,
    relayId: options.relayId,
    callScript: script,
  });
};

/**
 * Places an outbound voice call using a public callback URL that can collect keypad input.
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} twimlUrl - Public URL for provider call instructions
 * @param {string} [statusCallbackUrl] - Public URL for call lifecycle callbacks
 */
export const placeInteractivePhoneRelayCall = async (to, _twimlUrl, _statusCallbackUrl, options = {}) => {
  return placeTelnyxOutboundCall(to, {
    kind: 'order-relay',
    interactive: true,
    relayId: options.relayId,
  });
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

