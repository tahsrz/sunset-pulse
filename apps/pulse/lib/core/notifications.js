import { sendTelnyxSMS } from '@/lib/messaging/telnyxClient';

/**
 * Basic Telnyx notification utility to alert Taz when a high-probability lead is captured.
 * 
 * @param {Object} lead - The lead object containing probability and other details.
 */
export const notifyHighProbLead = async (lead) => {
  if (lead.probability > 0.8) {
    const message = `High-probability lead captured! Name: ${lead.name || 'Anonymous'}, Prob: ${Math.round(lead.probability * 100)}%`;
    
    try {
      await sendTelnyxSMS(process.env.ADMIN_PHONE_NUMBER || '+10987654321', message);
      console.log('Notification sent successfully.');
    } catch (error) {
      console.error('Failed to send Telnyx notification:', error);
    }
  } else {
    console.log(`Lead probability too low: ${lead.probability}. No notification sent.`);
  }
};

/**
 * Notify Taz of a new tour request via tactical communication grid.
 */
export const notifyTourRequest = async (tourData) => {
  const message = `[RECON_REQUEST]: ${tourData.userName} requested a ${tourData.tourType} tour for ${tourData.property}. Schedule: ${tourData.preferredDate} @ ${tourData.preferredTime}`;
  
  try {
    await sendTelnyxSMS(process.env.ADMIN_PHONE_NUMBER || '+10987654321', message);
    console.log('Tour request notification sent successfully.');
  } catch (error) {
    console.error('Failed to send Telnyx tour notification:', error);
  }
};
