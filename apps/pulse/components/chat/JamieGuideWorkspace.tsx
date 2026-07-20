'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUp,
  Bot,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Square,
  UserRound,
  X,
} from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import type {
  PublicGuideDataParts,
  PublicGuideAction,
  PublicGuideActionId,
  PublicGuideAgent,
  PublicGuideClientEventName,
  PublicGuideContext,
  PublicGuideListing,
  PublicGuideUIMessage,
} from '@/lib/ai/publicGuideContract';
import {
  PUBLIC_GUIDE_NEXT_STEPS,
  type PublicGuideHandoffInput,
} from '@/lib/ai/publicGuideHandoffContract';

const GUIDE_STARTERS = [
  'Find homes in Frisco under $750,000',
  'What should I ask before touring a home?',
  'Explain Sunset Pulse to a busy real estate agent',
  'Help me compare two neighborhoods objectively',
];

type TrackGuideEvent = (
  event: PublicGuideClientEventName,
  actionId?: PublicGuideActionId,
) => void;

export function JamieGuideWorkspace({
  featuredPrompt,
  initialContext,
}: {
  featuredPrompt?: string;
  initialContext?: PublicGuideContext | null;
}) {
  const [input, setInput] = useState('');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [analyticsSessionId] = useState(() => globalThis.crypto?.randomUUID?.() || `jamie-${Date.now()}`);
  const starters = useMemo(
    () => Array.from(new Set([featuredPrompt, ...GUIDE_STARTERS].filter((value): value is string => Boolean(value)))).slice(0, 4),
    [featuredPrompt],
  );
  const contextInput = useMemo(() => {
    const listingId = initialContext?.listing?.id;
    const siteSlug = initialContext?.agent?.site;
    return listingId || siteSlug ? { listingId, siteSlug } : undefined;
  }, [initialContext?.agent?.site, initialContext?.listing?.id]);
  const transport = useMemo(
    () => new DefaultChatTransport<PublicGuideUIMessage>({
      api: '/api/jamie/guide',
      body: { analyticsSessionId, ...(contextInput ? { context: contextInput } : {}) },
    }),
    [analyticsSessionId, contextInput],
  );
  const { messages, sendMessage, status, error, stop } = useChat<PublicGuideUIMessage>({ transport });
  const isBusy = status === 'submitted' || status === 'streaming';
  const hasAgentContext = Boolean(initialContext?.agent);
  const hasListingContext = Boolean(initialContext?.listing);
  const handoffSnapshot = useMemo(
    () => buildHandoffSnapshot(messages, initialContext?.listing),
    [initialContext?.listing, messages],
  );

  useEffect(() => {
    postGuideEvent({
      event: 'guide_opened',
      sessionId: analyticsSessionId,
      hasAgentContext,
      hasListingContext,
    });
  }, [analyticsSessionId, hasAgentContext, hasListingContext]);

  const send = (text: string) => {
    const prompt = text.trim();
    if (!prompt || isBusy) return;
    void sendMessage({ text: prompt });
    setInput('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send(input);
  };

  const trackGuideEvent: TrackGuideEvent = (event, actionId) => {
    postGuideEvent({
      event,
      actionId,
      sessionId: analyticsSessionId,
      hasAgentContext,
      hasListingContext,
    });
  };

  const openHandoff = () => {
    setHandoffOpen(true);
    trackGuideEvent('handoff_open', 'contact_agent');
    requestAnimationFrame(() => document.getElementById('jamie-agent-handoff')?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <div className="grid gap-5">
    <section className="flex h-[min(760px,82vh)] min-h-[580px] w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#091019] shadow-2xl shadow-black/30">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-200/20 bg-sky-200/10 text-sky-100">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-white">Ask Jamie</h2>
            <p className="truncate text-xs text-slate-400">Public guide to homes, decisions, and Sunset Pulse</p>
          </div>
        </div>
        <span className="hidden items-center gap-2 text-xs font-bold text-emerald-200 sm:flex">
          <ShieldCheck size={14} /> Verified answers
        </span>
      </header>

      {initialContext ? <GuideContextBar context={initialContext} onTrack={trackGuideEvent} /> : null}

      <Conversation className="min-h-0 bg-[#071019]">
        <ConversationContent className="gap-5 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <ConversationEmptyState className="min-h-[360px] text-slate-300">
              <div className="mx-auto w-full max-w-2xl">
                <div className="flex justify-center text-sky-200"><Search size={28} /></div>
                <h3 className="mt-4 text-lg font-black text-white">Where should we begin?</h3>
                <p className="mt-2 text-sm text-slate-400">Ask a question in your own words or choose a path below.</p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => send(starter)}
                      className="min-h-12 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-bold leading-5 text-slate-200 transition hover:border-sky-200/30 hover:bg-sky-200/10 hover:text-white"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <GuideMessage key={message.id} message={message} onHandoff={openHandoff} onTrack={trackGuideEvent} />
            ))
          )}

          {isBusy ? (
            <div className="flex items-center gap-2 text-xs font-bold text-sky-200">
              <Loader2 size={14} className="animate-spin" /> Jamie is finding the useful path...
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error.message || 'Jamie could not answer that just now.'}
            </p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to the latest message" title="Scroll to latest" />
      </Conversation>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[#0b141f] p-3 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-lg border border-sky-200/20 bg-[#050b12] p-2 focus-within:border-sky-200/45">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={4000}
            aria-label="Question for Jamie"
            placeholder="Ask about a home, a decision, or Sunset Pulse..."
            className="min-h-14 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop Jamie's response"
              title="Stop response"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/10"
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send question"
              title="Send question"
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-300 text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] leading-5 text-slate-500">
          Jamie checks listing facts before stating them. Keep private client details out of public questions.
        </p>
      </form>
    </section>
    {handoffOpen && initialContext?.agent ? (
      <GuideHandoffPanel
        agent={initialContext.agent}
        listing={initialContext.listing}
        conversation={handoffSnapshot.conversation}
        discussedListingIds={handoffSnapshot.discussedListingIds}
        sessionId={analyticsSessionId}
        onClose={() => setHandoffOpen(false)}
        onSubmitted={() => trackGuideEvent('handoff_submit', 'contact_agent')}
      />
    ) : null}
    </div>
  );
}

function GuideMessage({
  message,
  onHandoff,
  onTrack,
}: {
  message: PublicGuideUIMessage;
  onHandoff: () => void;
  onTrack: TrackGuideEvent;
}) {
  return (
    <Message from={message.role}>
      <MessageContent
        className={message.role === 'user'
          ? 'rounded-lg bg-sky-300 px-4 py-3 font-bold text-slate-950'
          : 'w-full gap-4 overflow-visible text-slate-100'}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return message.role === 'assistant' ? (
              <MessageResponse
                key={`${message.id}-text-${index}`}
                className="prose-invert max-w-none text-sm leading-7"
                disallowedElements={['a']}
                unwrapDisallowed
              >
                {part.text}
              </MessageResponse>
            ) : (
              <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap text-sm leading-6">{part.text}</p>
            );
          }

          if (part.type === 'data-listings') {
            return <GuideListings key={`${message.id}-listings-${index}`} data={part.data} onTrack={onTrack} />;
          }

          if (part.type === 'data-actions') {
            return (
              <GuideActions
                key={`${message.id}-actions-${index}`}
                actions={part.data.items}
                onHandoff={onHandoff}
                onTrack={onTrack}
              />
            );
          }

          if (part.type === 'data-sources') {
            return <GuideSources key={`${message.id}-sources-${index}`} data={part.data} />;
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
}

function GuideContextBar({ context, onTrack }: { context: PublicGuideContext; onTrack: TrackGuideEvent }) {
  const listing = context.listing;
  const agent = context.agent;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="font-black uppercase tracking-[0.16em] text-sky-100/55">Verified entry context</p>
        <p className="mt-1 truncate font-bold text-slate-200">
          {listing?.name || 'Property guidance'}{agent ? ` with ${agent.agentName}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {listing ? (
          <a
            href={listing.href}
            onClick={() => onTrack('listing_opened', 'view_listing')}
            className="inline-flex items-center gap-1.5 font-black text-sky-200 hover:text-white"
          >
            View home <ExternalLink size={13} />
          </a>
        ) : null}
        <Link href="/" className="font-bold text-slate-400 hover:text-white">Clear context</Link>
      </div>
    </div>
  );
}

function GuideActions({
  actions,
  onHandoff,
  onTrack,
}: {
  actions: PublicGuideAction[];
  onHandoff: () => void;
  onTrack: TrackGuideEvent;
}) {
  return (
    <div className="grid gap-2 pt-1 sm:grid-cols-2">
      {actions.map((action) => {
        const content = (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-200/10 text-sky-200">
              <GuideActionIcon actionId={action.id} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-black text-white">{action.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-400">{action.description}</span>
            </span>
            <ArrowRight size={15} className="shrink-0 text-sky-200" />
          </>
        );

        if (action.kind === 'handoff') {
          return (
            <button
              key={action.id}
              type="button"
              onClick={onHandoff}
              className="flex min-h-16 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-sky-200/30 hover:bg-sky-200/10"
            >
              {content}
            </button>
          );
        }

        return (
          <a
            key={action.id}
            href={action.href}
            onClick={() => onTrack(action.id === 'view_listing' ? 'listing_opened' : 'action_click', action.id)}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-sky-200/30 hover:bg-sky-200/10"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}

function GuideActionIcon({ actionId }: { actionId: PublicGuideActionId }) {
  if (actionId === 'contact_agent') return <Mail size={15} />;
  if (actionId === 'view_agent_site') return <UserRound size={15} />;
  if (actionId === 'view_listing') return <MapPin size={15} />;
  if (actionId === 'explore_sunset_pulse') return <MessageCircle size={15} />;
  return <Search size={15} />;
}

function GuideListings({ data, onTrack }: {
  data: PublicGuideDataParts['listings'];
  onTrack: TrackGuideEvent;
}) {
  if (!data.properties.length) return null;

  return (
    <div className="grid gap-3 pt-1 sm:grid-cols-2">
      {data.properties.map((property) => (
        <GuideListingCard key={property.id} property={property} onTrack={onTrack} />
      ))}
    </div>
  );
}

function GuideListingCard({ property, onTrack }: {
  property: PublicGuideListing;
  onTrack: TrackGuideEvent;
}) {
  const location = [property.city, property.state].filter(Boolean).join(', ');
  const details = [
    property.beds ? `${property.beds} bd` : null,
    property.baths ? `${property.baths} ba` : null,
  ].filter(Boolean).join(' / ');

  return (
    <a
      href={property.href}
      onClick={() => onTrack('listing_opened', 'view_listing')}
      className="group/listing overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition hover:border-sky-200/35 hover:bg-white/[0.07]"
    >
      {property.image ? (
        // Listing image hosts vary by MLS source and are validated before reaching Jamie.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={property.image} alt={property.name} className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{property.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} /> {location || 'North Texas'}
            </p>
          </div>
          <ExternalLink size={15} className="shrink-0 text-sky-200" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-black text-sky-100">{formatPrice(property.price)}</span>
          {details ? <span className="text-slate-400">{details}</span> : null}
        </div>
      </div>
    </a>
  );
}

function GuideSources({ data }: { data: PublicGuideDataParts['sources'] }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-400">
      {data.items.map((source) => (
        <span key={`${source.label}-${source.detail}`} className="inline-flex min-w-0 flex-wrap items-center gap-1.5 break-words">
          <ShieldCheck size={12} className="text-emerald-300" />
          <strong className="text-slate-300">{source.label}</strong>
          <span>{source.detail}</span>
        </span>
      ))}
    </div>
  );
}

function GuideHandoffPanel({
  agent,
  conversation,
  discussedListingIds,
  listing,
  onClose,
  onSubmitted,
  sessionId,
}: {
  agent: PublicGuideAgent;
  conversation: PublicGuideHandoffInput['conversation'];
  discussedListingIds: string[];
  listing?: PublicGuideListing;
  onClose: () => void;
  onSubmitted: () => void;
  sessionId: string;
}) {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/sites/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.agentId,
          site: agent.site,
          siteName: agent.siteName,
          source: 'jamie_public_guide',
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          phone: String(data.get('phone') || ''),
          preferredContact: String(data.get('preferredContact') || 'either'),
          message: String(data.get('message') || ''),
          company: String(data.get('company') || ''),
          consent: data.get('consent') === 'on',
          listing: listing ? { id: listing.id, mlsId: listing.mlsId, name: listing.name } : undefined,
          guide: {
            conversation,
            discussedListingIds,
            nextStep: String(data.get('nextStep') || (listing ? 'discuss_listing' : 'refine_search')),
            sessionId,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || 'The inquiry could not be sent.');

      setSubmitState('success');
      onSubmitted();
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(error instanceof Error ? error.message : 'The inquiry could not be sent.');
    }
  };

  return (
    <section id="jamie-agent-handoff" className="rounded-lg border border-white/10 bg-[#091019] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-100/50">Private agent handoff</p>
          <h2 className="mt-2 text-xl font-black text-white">Send {agent.agentName} an inquiry</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your form and a compact Jamie brief can go to {agent.siteName}. The raw public conversation is never attached or stored with the lead.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agent handoff"
          title="Close handoff"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {submitState === 'success' ? (
        <div className="mt-6 border-t border-white/10 pt-6 text-center" aria-live="polite">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
          <p className="mt-3 font-black text-white">Inquiry sent.</p>
          <p className="mt-1 text-sm text-slate-400">{agent.agentName} can follow up from here.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <input name="company" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="grid gap-4 sm:grid-cols-2">
            <HandoffInput name="name" label="Name" autoComplete="name" required />
            <HandoffInput name="email" label="Email" type="email" autoComplete="email" required />
            <HandoffInput name="phone" label="Phone" type="tel" autoComplete="tel" />
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-300">Preferred contact</span>
              <select name="preferredContact" defaultValue="either" className="h-11 w-full rounded-lg border border-white/10 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-sky-200/45">
                <option value="either">Email or phone</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-300">What should happen next?</span>
            <select
              name="nextStep"
              defaultValue={listing ? 'discuss_listing' : 'refine_search'}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-sky-200/45"
            >
              {PUBLIC_GUIDE_NEXT_STEPS.map((nextStep) => (
                <option key={nextStep.id} value={nextStep.id}>{nextStep.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-300">Message</span>
            <textarea
              name="message"
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              defaultValue={listing ? `I would like more information about ${listing.name}.` : 'I would like help with my property search.'}
              className="w-full resize-y rounded-lg border border-white/10 bg-[#050b12] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-sky-200/45"
            />
          </label>
          <label className="flex items-start gap-3 text-xs leading-5 text-slate-400">
            <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-sky-300" />
            <span>I consent to send these contact details, this message, and a compact summary of my stated needs to {agent.agentName}. No raw public chat transcript will be sent or stored with the lead.</span>
          </label>
          {errorMessage ? <p className="text-sm font-bold text-red-200" aria-live="polite">{errorMessage}</p> : null}
          <button
            type="submit"
            disabled={submitState === 'submitting'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60 sm:justify-self-start"
            style={{ backgroundColor: agent.primaryColor }}
          >
            {submitState === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {submitState === 'submitting' ? 'Sending...' : 'Send private inquiry'}
          </button>
        </form>
      )}
    </section>
  );
}

function buildHandoffSnapshot(
  messages: PublicGuideUIMessage[],
  entryListing?: PublicGuideListing,
): Pick<PublicGuideHandoffInput, 'conversation' | 'discussedListingIds'> {
  const conversation = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      text: message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000),
    }))
    .filter((message) => message.text.length > 0)
    .slice(-12);
  const discussedListingIds = messages.flatMap((message) => message.parts.flatMap((part) => (
    part.type === 'data-listings' ? part.data.properties.map((listing) => listing.mlsId || listing.id) : []
  )));

  return {
    conversation,
    discussedListingIds: Array.from(new Set([
      ...(entryListing ? [entryListing.mlsId || entryListing.id] : []),
      ...discussedListingIds,
    ])).slice(0, 8),
  };
}

function postGuideEvent(input: {
  actionId?: PublicGuideActionId;
  event: PublicGuideClientEventName;
  hasAgentContext: boolean;
  hasListingContext: boolean;
  sessionId: string;
}) {
  void fetch('/api/jamie/guide/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(input),
  }).catch(() => undefined);
}

function HandoffInput({
  autoComplete,
  label,
  name,
  required = false,
  type = 'text',
}: {
  autoComplete?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-lg border border-white/10 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-sky-200/45"
      />
    </label>
  );
}

function formatPrice(price?: number | null) {
  return price ? `$${price.toLocaleString()}` : 'Price on request';
}
