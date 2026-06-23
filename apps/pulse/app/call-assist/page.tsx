import type { Metadata } from 'next';
import CallAssistConsole from '@/components/call-assist/CallAssistConsole';

export const metadata: Metadata = {
  title: 'Jamie Call Assist | Sunset Pulse',
  description: 'Consent-gated live call assist for real estate conversations.'
};

export default function CallAssistPage() {
  return <CallAssistConsole />;
}
