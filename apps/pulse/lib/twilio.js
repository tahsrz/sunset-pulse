import 'server-only';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder-token';

export const twilioClient = twilio(accountSid, authToken);

/**
 * Placeholder logic for RENTCAST/JAMIE integration
 * This will be expanded in the future.
 */
export const sendLeadAlert = async (leadData) => {
  // Logic to notify Taz about a high-probability lead
  console.log('Sending lead alert via Twilio:', leadData);
  return { success: true };
};

/**
 * Sends a generic SMS text message via Twilio Client
 * @param {string} to - Destination phone number in E.164 format
 * @param {string} body - Text content of the SMS
 */
export const sendSMS = async (to, body) => {
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const currentSid = process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder';
  const currentToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder-token';

  if (!fromNumber || fromNumber.includes('placeholder')) {
    console.warn(`[TWILIO_SMS_SKIPPED]: Missing TWILIO_FROM_NUMBER. Destination: ${to}. Content: "${body}"`);
    return { success: false, reason: 'Missing Twilio From Number configuration' };
  }

  if (currentSid.includes('placeholder') || currentToken.includes('placeholder')) {
    console.warn(`[TWILIO_SMS_MOCKED]: Using placeholder credentials. SMS simulated to ${to}: "${body}"`);
    return { success: true, mocked: true };
  }

  try {
    const client = twilio(currentSid, currentToken);
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    console.log(`[TWILIO_SMS_SENT]: SID: ${message.sid} to ${to}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`[TWILIO_SMS_ERROR]: Failed sending to ${to}. Error:`, error.message);
    return { success: false, error: error.message };
  }
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

