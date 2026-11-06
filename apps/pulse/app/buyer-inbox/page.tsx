import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import { SellerWorkspaceNav } from '@/components/realtor/SellerWorkspaceNav';
import { choiceQuestions, type ChoiceField } from '@/lib/marketing/guidedJourney';
import { RealtorWorkspaceError, requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { readOwnedBuyerRequests } from '@/lib/realtor-workspace/buyerRequestStore.server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Buyer Inbox | Sunset Pulse', robots: { index: false, follow: false } };

type BuyerRequests = Awaited<ReturnType<typeof readOwnedBuyerRequests>>;
type BuyerJourney = BuyerRequests[number]['journey'];

function answerLabel(field: ChoiceField, answer: BuyerJourney['buyingStage'] | BuyerJourney['buyerPreferences']['destination' | 'construction' | 'representation']) {
  if (answer.state === 'skipped') return 'Skipped';
  if (answer.state === 'unknown') return 'Not Sure';
  return choiceQuestions[field].options.find(option => option.value === answer.value)?.label;
}

const approvalLabel = { yes: 'Yes', no: 'Not Yet', unknown: 'Not Sure', skipped: 'Skipped' } as const;

export default async function BuyerInboxPage() {
  const { data: { user }, error: authError } = await createClient().auth.getUser();
  if (authError || !user) redirect('/login?redirect=%2Fbuyer-inbox');

  let requests: BuyerRequests = [];
  let error: string | undefined;
  let timeZone = 'America/Chicago';
  try {
    const { preferences } = await requirePersonalRealtorWorkspace(user.id);
    timeZone = preferences.time_zone;
    requests = await readOwnedBuyerRequests(user.id);
  } catch (cause) {
    error = cause instanceof RealtorWorkspaceError && cause.code === 'SETUP_REQUIRED'
      ? 'Set up your personal planner to open your buyer inbox.'
      : 'Your buyer inbox is unavailable. Try again shortly.';
  }

  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone });
  return <FieldbookShell title="Buyer Inbox" navigation={<SellerWorkspaceNav active="/buyer-inbox" showBuyerInbox />}>
    {error ? <div className="fieldbook-panel">
      <p role="alert">{error}</p>
      <Link href="/today" className="mt-4 inline-block text-cyan-200 underline">Open Today</Link>
    </div> : requests.length === 0 ? <p className="fieldbook-panel">No buyer requests have been assigned to you yet.</p> : <>
      <p className="mb-4 text-sm text-slate-300">Your latest buyer requests</p>
      <ul className="space-y-4">
        {requests.map(({ id, name, email, requestedContactAt, journey, marketingOptIn }) => {
          const { destination, construction, representation, preApproval } = journey.buyerPreferences;
          const answers = [
            ['Search Stage', answerLabel('buying-stage', journey.buyingStage)],
            ['Staying in North Texas?', answerLabel('destination', destination)],
            ['Home Type', answerLabel('construction', construction)],
            ['Already Working With an Agent?', answerLabel('representation', representation)],
            ['Preapproved for a Mortgage?', approvalLabel[preApproval]],
          ];
          return <li key={id} className="fieldbook-panel space-y-4">
            <div>
              <h2 className="text-xl">{name}</h2>
              <p className="break-all text-cyan-100">{email}</p>
              <p className="mt-2 text-sm text-slate-300">Requested an email on <time dateTime={requestedContactAt}>{date.format(new Date(requestedContactAt))}</time>.</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {answers.map(([label, value]) => <div key={label}>
                <dt className="text-xs text-slate-300">{label}</dt><dd className="text-sm text-white">{value}</dd>
              </div>)}
            </dl>
            <p className="text-sm text-slate-300">{marketingOptIn ? 'Opted in to local real estate updates.' : 'Only requested a reply about this search.'}</p>
          </li>;
        })}
      </ul>
    </>}
  </FieldbookShell>;
}
