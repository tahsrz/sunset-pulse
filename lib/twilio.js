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
