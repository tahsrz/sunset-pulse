'use client';

import React, { useEffect, useRef, useState } from 'react';
import { buyerRequestSchema, type BuyerRequest } from '@/lib/marketing/buyerJourneyContract';
import { answered, choiceQuestions, createInitialJourneyDraft, reviewRows, sectionFor, setChoice, validateStep, type GuidedJourneyDraft, type StepId } from '@/lib/marketing/guidedJourney';
import { readSellerReceipt, type PendingJourneyAttempt } from '@/lib/marketing/guidedJourneyRequest';
import GuidedJourneyShell from './GuidedJourneyShell';
import JourneyChoiceGroup from './JourneyChoiceGroup';
import styles from './GuidedJourney.module.css';

const questions = ['buying-stage', 'destination', 'construction', 'representation', 'pre-approval'] as const;
const steps: StepId[] = [...questions, 'review', 'contact'];
const sections = ['buying', 'review'] as const;
const payloadSchema = buyerRequestSchema.omit({ submissionId: true });
const initialDraft = (): GuidedJourneyDraft => ({ ...createInitialJourneyDraft(), mode: 'buy' });

export default function GuidedBuyerRequestForm({ campaign }: { campaign?: BuyerRequest['campaign'] }) {
  const [draft, setDraft] = useState(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const attempt = useRef<PendingJourneyAttempt | null>(null);
  const step = steps[stepIndex];
  const questionField = questions[stepIndex];
  const question = questionField ? choiceQuestions[questionField] : null;
  const reviewIndex = questions.length;

  useEffect(() => { heading.current?.focus(); }, [step, complete]);
  useEffect(() => () => { request.current?.abort(); }, []);

  function goTo(index: number, edit = false) {
    setError('');
    setStepIndex(index);
    setEditing(edit);
  }

  function updateContact(change: Partial<GuidedJourneyDraft['contact']>) {
    setError('');
    setDraft(current => ({ ...current, contact: { ...current.contact, ...change } }));
  }

  async function next() {
    if (request.current || complete) return;
    const validation = validateStep(step, draft);
    if (validation) { setError(validation); return; }
    if (step !== 'contact') {
      goTo(editing ? reviewIndex : stepIndex + 1);
      return;
    }

    const choices = draft.choices;
    const preApproval = choices['pre-approval'];
    const payload = payloadSchema.safeParse({
      offerKey: 'sunset-pulse-buyer-plan', offerVersion: '1', ...draft.contact,
      email: draft.contact.email.toLowerCase(), company, campaign,
      journey: {
        mode: 'buy', buyingStage: choices['buying-stage'], buyerPreferences: {
          destination: choices.destination, construction: choices.construction, representation: choices.representation,
          preApproval: preApproval.state === 'answered' ? preApproval.value : preApproval.state,
        },
      },
    });
    if (!payload.success) { setError('Check your answers and email address, then try again.'); return; }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      // The schema fixes key order and normalizes contact input. Keep the retry key in memory only.
      const fingerprint = JSON.stringify(payload.data);
      if (attempt.current?.fingerprint !== fingerprint) {
        attempt.current = { fingerprint, submissionId: globalThis.crypto.randomUUID() };
      }
      const response = await fetch('/api/buyer-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...payload.data, submissionId: attempt.current.submissionId }),
      });
      if (response.status === 429) { setError('Too many attempts. Wait a minute, then try again.'); return; }
      if (!response.ok) throw new Error('Buyer request failed.');
      readSellerReceipt(await response.json());
      attempt.current = null;
      setDraft(initialDraft());
      setCompany('');
      setComplete(true);
    } catch {
      setError('We couldn’t confirm your request. Please try again.');
    } finally {
      clearTimeout(timeout);
      request.current = null;
      setBusy(false);
    }
  }

  let content;
  if (complete) {
    content = <div className={styles.receipt}>
      <p>We’ll email you about your home search. You can keep looking in Explorer in the meantime.</p>
      <div className={styles.inlineActions}><a href="/explorer" className={styles.next}>Open Explorer</a></div>
    </div>;
  } else if (question && questionField) {
    const answer = draft.choices[questionField];
    const options = [...question.options.filter(option => option.value !== 'not_buying'), { value: '__unknown', label: 'Not Sure' }];
    content = <JourneyChoiceGroup legend={question.title} options={options} value={answer.state === 'unknown' ? '__unknown' : answered<string>(answer)}
      onChange={value => { setError(''); setDraft(current => setChoice(current, questionField, value)); }} />;
  } else if (step === 'review') {
    content = <dl className={styles.review}>{reviewRows(draft).filter(row => row.step !== 'approval-amount').map(row => (
      <div key={row.step} className={styles.reviewRow}>
        <div><dt>{row.label}</dt><dd>{row.value}</dd></div>
        <button type="button" className={styles.edit} aria-label={`Edit ${row.label}`} onClick={() => goTo(steps.indexOf(row.step), true)}>Edit</button>
      </div>
    ))}</dl>;
  } else {
    content = <>
      <div className={styles.inputGrid}>
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Your Name
          <input className={styles.input} autoComplete="name" maxLength={120} value={draft.contact.name} onChange={event => updateContact({ name: event.target.value })} />
        </label>
        <label className={`${styles.fieldLabel} ${styles.wide}`}>Email
          <input className={styles.input} type="email" autoComplete="email" maxLength={180} value={draft.contact.email} onChange={event => updateContact({ email: event.target.value.trim() })} />
        </label>
      </div>
      <div className="mt-6">
        <label className={styles.check}><input type="checkbox" checked={draft.contact.requestedContact} onChange={event => updateContact({ requestedContact: event.target.checked })} />I’d like an email about this request.</label>
        <label className={styles.check}><input type="checkbox" checked={draft.contact.marketingOptIn} onChange={event => updateContact({ marketingOptIn: event.target.checked })} />Send me occasional local real estate updates. Optional.</label>
      </div>
      <label aria-hidden="true" className={styles.srOnly}>Leave this field empty
        <input name="company" tabIndex={-1} autoComplete="off" maxLength={120} value={company} onChange={event => setCompany(event.target.value)} />
      </label>
      <a href="/iabs" target="_blank" rel="noopener noreferrer" className={styles.helper}>Brokerage Services Information</a>
    </>;
  }

  const title = complete ? 'Request Received' : question?.title ?? (step === 'review' ? 'Review Your Answers' : 'Where Should We Send a Reply?');
  return <GuidedJourneyShell live title={title} section={sectionFor(step)} sections={[...sections]} property="Your Next Home"
    headingRef={heading} exitLink={{ href: '/explorer', label: 'Back to Explorer' }}
    onSubmit={next} onBack={() => goTo(editing ? reviewIndex : stepIndex - 1)} canGoBack={!complete && (editing || stepIndex > 0)}
    error={error} busy={busy} final={step === 'contact'} returnToReview={editing} complete={complete}
    aside={<div className={styles.asideInner}>
      <p className={styles.asideEyebrow}>North Texas</p>
      <h2 className={styles.asideTitle}>Find a Home</h2>
      <p className={styles.asideCopy}>Tell us where you are in your search so we can pick up from there.</p>
    </div>}>{content}</GuidedJourneyShell>;
}
