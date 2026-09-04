import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Vibe from '@/models/Vibe';
import VibeRevision from '@/models/VibeRevision';
import { SiteConfig } from '@/models/SiteConfig';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import { vibeDraftSchema, type VibeDraft } from './vibeSchema';
import { replaceVibeTermRelationships, resolveLegacyTaxonomyTermIds } from './taxonomyRepository';

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashVibeDraft(draft: VibeDraft): string {
  return crypto.createHash('sha256').update(stableSerialize(draft)).digest('hex');
}

export function nextRevisionNumber(previousRevisionNumber?: number): number {
  return (previousRevisionNumber || 0) + 1;
}

export async function saveVibeDraft(input: {
  vibeId: string;
  tenantId: string;
  draft: VibeDraft;
  actorId: string;
  expectedVersion?: number;
}) {
  const draft = vibeDraftSchema.parse(input.draft);
  const filter: Record<string, unknown> = { vibeId: input.vibeId, tenantId: input.tenantId, status: { $in: ['draft', 'published'] } };
  if (input.expectedVersion !== undefined) filter.currentDraftVersion = input.expectedVersion;

  const updated = await Vibe.findOneAndUpdate(filter, {
    $set: {
      title: draft.title,
      name: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      longDescription: draft.description,
      taxonomyTermIds: draft.taxonomyTermIds,
      source: draft.source,
      draftPayload: draft,
      linguisticLogic: draft.tokens.linguistic,
      visualParameters: draft.tokens.visual.effects,
      updatedBy: input.actorId,
      updatedAt: new Date(),
      status: 'draft',
    },
    $unset: { submittedRevisionId: 1 },
    $inc: { currentDraftVersion: 1 },
  }, { new: true, runValidators: true }).lean();

  if (!updated) {
    throw new Error(input.expectedVersion === undefined ? 'VIBE_NOT_FOUND' : 'VIBE_DRAFT_CONFLICT');
  }
  if (process.env.VIBE_TAXONOMY_NORMALIZED_WRITE === '1') {
    try {
      const resolved = await resolveLegacyTaxonomyTermIds({ tenantId: input.tenantId, legacyIds: draft.taxonomyTermIds });
      await replaceVibeTermRelationships({ tenantId: input.tenantId, vibeId: input.vibeId, termIds: resolved.termIds, actorId: input.actorId });
      if (resolved.unknownLegacyIds.length > 0) {
        console.warn('VIBE_TAXONOMY_UNKNOWN_LEGACY_IDS', { tenantId: input.tenantId, vibeId: input.vibeId, unknownLegacyIds: resolved.unknownLegacyIds });
      }
    } catch (error) {
      console.warn('VIBE_TAXONOMY_DUAL_WRITE_FAILED', { tenantId: input.tenantId, vibeId: input.vibeId, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return updated;
}

export async function publishVibeRevision(input: {
  vibeId: string;
  tenantId: string;
  submittedRevisionId?: string;
  draft?: VibeDraft;
  actorId: string;
  changeSummary?: string;
  rollbackReason?: string;
  rollbackSourceRevisionId?: string;
}) {
  const session = await mongoose.startSession();
  try {
    let published;
    await session.withTransaction(async () => {
      const vibe = await Vibe.findOne({ vibeId: input.vibeId, tenantId: input.tenantId }).session(session);
      if (!vibe) throw new Error('VIBE_NOT_FOUND');
      if (input.submittedRevisionId && (vibe.status !== 'in_review' || String(vibe.submittedRevisionId || '') !== input.submittedRevisionId)) throw new Error('INVALID_SUBMITTED_REVISION');
      const submittedSnapshot = input.submittedRevisionId ? await VibeRevision.findOne({ _id: input.submittedRevisionId, vibeId: input.vibeId, tenantId: input.tenantId, publishedAt: { $exists: false } }).session(session).lean() as any : null;
      if (input.submittedRevisionId && !submittedSnapshot) throw new Error('INVALID_SUBMITTED_REVISION');
      const draft = vibeDraftSchema.parse(submittedSnapshot?.snapshot || input.draft);
      assertReadableTheme(draft);
      const previous = await VibeRevision.findOne({ vibeId: input.vibeId, tenantId: input.tenantId }).sort({ revisionNumber: -1 }).session(session).lean() as any;
      const revisionNumber = nextRevisionNumber(previous?.revisionNumber);
      const revisionId = new mongoose.Types.ObjectId().toString();
      const revision = new VibeRevision({
        _id: revisionId,
        vibeId: input.vibeId,
        tenantId: input.tenantId,
        revisionNumber,
        snapshot: draft,
        cssVars: compileCssVars(draft),
        voiceConfig: draft.tokens.linguistic,
        contentHash: hashVibeDraft(draft),
        parentRevisionId: previous?._id,
        changeSummary: input.changeSummary || '',
        createdBy: input.actorId,
        publishedAt: new Date(),
        publishedBy: input.actorId,
      });
      await revision.save({ session });
      await VibeAuditEvent.create([{ vibeId: input.vibeId, tenantId: input.tenantId, action: 'published', revisionId, actorId: input.actorId, reason: input.changeSummary || '' }], { session });
      if (input.rollbackReason) await VibeAuditEvent.create([{ vibeId: input.vibeId, tenantId: input.tenantId, action: 'rolled_back', revisionId, sourceRevisionId: input.rollbackSourceRevisionId, actorId: input.actorId, reason: input.rollbackReason }], { session });
      vibe.publishedRevisionId = revisionId;
      vibe.status = 'published';
      vibe.publishedBy = input.actorId;
      await vibe.save({ session });
      published = revision.toObject();
    });
    return published;
  } finally {
    await session.endSession();
  }
}

export async function submitVibeRevision(input: { vibeId: string; tenantId: string; actorId: string }) {
  const session = await mongoose.startSession();
  try {
    let submitted;
    await session.withTransaction(async () => {
      const vibe = await Vibe.findOne({ vibeId: input.vibeId, tenantId: input.tenantId }).session(session);
      if (!vibe) throw new Error('VIBE_NOT_FOUND');
      if (vibe.status !== 'draft') throw new Error('INVALID_TRANSITION');
      const draft = vibeDraftSchema.parse(vibe.draftPayload);
      const previous = await VibeRevision.findOne({ vibeId: input.vibeId, tenantId: input.tenantId }).sort({ revisionNumber: -1 }).session(session).lean() as any;
      const revisionId = new mongoose.Types.ObjectId().toString();
      const revision = new VibeRevision({ _id: revisionId, vibeId: input.vibeId, tenantId: input.tenantId, revisionNumber: nextRevisionNumber(previous?.revisionNumber), snapshot: draft, cssVars: compileCssVars(draft), voiceConfig: draft.tokens.linguistic, contentHash: hashVibeDraft(draft), parentRevisionId: previous?._id, changeSummary: 'Submitted for review', createdBy: input.actorId });
      await revision.save({ session });
      vibe.status = 'in_review';
      vibe.submittedRevisionId = revisionId;
      vibe.updatedBy = input.actorId;
      vibe.updatedAt = new Date();
      await vibe.save({ session });
      await VibeAuditEvent.create([{ vibeId: input.vibeId, tenantId: input.tenantId, action: 'submitted', revisionId, actorId: input.actorId }], { session });
      submitted = revision.toObject();
    });
    return submitted;
  } finally {
    await session.endSession();
  }
}

export function assertReadableTheme(draft: VibeDraft) {
  const colors = draft.tokens.visual.theme.colors;
  for (const background of [colors.background, colors.surface]) {
    if (contrastRatio(colors.textPrimary, background) < 4.5) throw new Error('PUBLISH_VALIDATION_FAILED: text contrast is below WCAG AA.');
  }
}

function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => {
    const normalized = hex.length === 4 ? hex.slice(1).split('').map((part) => part + part).join('') : hex.slice(1);
    const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  };
  const a = luminance(first); const b = luminance(second); const lighter = Math.max(a, b); const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export async function applyVibeRevisionToSite(input: { siteId: string; tenantId: string; vibeId: string; revisionId: string; actorId: string }) {
  const session = await mongoose.startSession();
  try {
    let site;
    await session.withTransaction(async () => {
      const revision = await VibeRevision.findOne({ _id: input.revisionId, vibeId: input.vibeId, tenantId: input.tenantId, publishedAt: { $exists: true, $ne: null } }).session(session).lean();
      if (!revision) throw new Error('PUBLISHED_REVISION_NOT_FOUND');
      site = await SiteConfig.findOneAndUpdate(
        { agentId: input.siteId },
        { $set: { activeVibeRevisionId: input.revisionId, activeVibeRevisionAppliedAt: new Date(), activeVibeRevisionAppliedBy: input.actorId, lastModifiedBy: input.actorId, updatedAt: new Date() } },
        { new: true, session },
      ).lean();
      if (!site) throw new Error('SITE_NOT_FOUND');
      await VibeAuditEvent.create([{ vibeId: (revision as any).vibeId, tenantId: input.tenantId, action: 'applied', revisionId: input.revisionId, siteId: input.siteId, actorId: input.actorId }], { session });
    });
    return site;
  } finally {
    await session.endSession();
  }
}

export async function readPublishedVibeProjection(input: { revisionId: string; tenantId: string }) {
  const revision = await VibeRevision.findOne({
    _id: input.revisionId,
    tenantId: input.tenantId,
    publishedAt: { $exists: true, $ne: null },
  }).select('_id vibeId tenantId revisionNumber cssVars voiceConfig').lean() as any;
  if (!revision) return null;
  return {
    revisionId: String(revision._id),
    vibeId: revision.vibeId,
    revisionNumber: revision.revisionNumber,
    cssVars: revision.cssVars || {},
    voiceConfig: revision.voiceConfig || {},
  };
}

export function compileCssVars(draft: VibeDraft) {
  const { colors, typography, layout } = draft.tokens.visual.theme;
  const radius = { none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', full: '9999px' }[layout.borderRadius];
  const elevation = {
    flat: 'none',
    subtle: '0 1px 2px rgb(0 0 0 / 0.08)',
    medium: '0 8px 24px rgb(0 0 0 / 0.14)',
    high: '0 18px 48px rgb(0 0 0 / 0.22)',
  }[layout.elevation];
  return {
    ...Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--color-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`, value])),
    '--font-family-heading': typography.fontFamilyHeading,
    '--font-family-body': typography.fontFamilyBody,
    '--font-size-base': typography.baseFontSize,
    '--font-weight-normal': String(typography.fontWeightNormal),
    '--font-weight-bold': String(typography.fontWeightBold),
    '--type-scale-ratio': String(typography.scaleRatio),
    '--radius-base': radius,
    '--spacing-base': `${layout.spacingBasePx}px`,
    '--elevation-base': elevation,
  };
}
