import { twilioClient } from '@/lib/twilio';

/**
 * Basic Twilio notification utility to alert Taz when a high-probability lead is captured.
 * 
 * @param {Object} lead - The lead object containing probability and other details.
 */
export const notifyHighProbLead = async (lead) => {
  if (lead.probability > 0.8) {
    const message = `High-probability lead captured! Name: ${lead.name || 'Anonymous'}, Prob: ${Math.round(lead.probability * 100)}%`;
    
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: process.env.ADMIN_PHONE_NUMBER || '+10987654321', // Taz's phone number
      });
      console.log('Notification sent successfully.');
    } catch (error) {
      console.error('Failed to send Twilio notification:', error);
    }
  } else {
    console.log(`Lead probability too low: ${lead.probability}. No notification sent.`);
  }
};
