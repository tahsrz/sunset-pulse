import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Vibe from '@/models/Vibe';
import VibeRevision from '@/models/VibeRevision';
import { SiteConfig } from '@/models/SiteConfig';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import { vibeDraftSchema, type VibeDraft } from './vibeSchema';

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

export async function saveVibeDraft(input: {
  vibeId: string;
  tenantId: string;
  draft: VibeDraft;
  actorId: string;
  expectedVersion?: number;
}) {
  const draft = vibeDraftSchema.parse(input.draft);
  const filter: Record<string, unknown> = { vibeId: input.vibeId, tenantId: input.tenantId };
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
    },
    $inc: { currentDraftVersion: 1 },
  }, { new: true, runValidators: true }).lean();

  if (!updated) {
    throw new Error(input.expectedVersion === undefined ? 'VIBE_NOT_FOUND' : 'VIBE_DRAFT_CONFLICT');
  }
  return updated;
}

export async function publishVibeRevision(input: {
  vibeId: string;
  tenantId: string;
  draft: VibeDraft;
  actorId: string;
  changeSummary?: string;
}) {
  const draft = vibeDraftSchema.parse(input.draft);
  assertReadableTheme(draft);
  const session = await mongoose.startSession();
  try {
    let published;
    await session.withTransaction(async () => {
      const vibe = await Vibe.findOne({ vibeId: input.vibeId, tenantId: input.tenantId }).session(session);
      if (!vibe) throw new Error('VIBE_NOT_FOUND');
      const previous = await VibeRevision.findOne({ vibeId: input.vibeId }).sort({ revisionNumber: -1 }).session(session).lean() as any;
      const revisionNumber = (previous?.revisionNumber || 0) + 1;
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

export async function applyVibeRevisionToSite(input: { siteId: string; tenantId: string; revisionId: string; actorId: string }) {
  const session = await mongoose.startSession();
  try {
    let site;
    await session.withTransaction(async () => {
      const revision = await VibeRevision.findOne({ _id: input.revisionId, tenantId: input.tenantId, publishedAt: { $exists: true, $ne: null } }).session(session).lean();
      if (!revision) throw new Error('PUBLISHED_REVISION_NOT_FOUND');
      site = await SiteConfig.findOneAndUpdate(
        { agentId: input.siteId },
        { $set: { activeVibeRevisionId: input.revisionId, lastModifiedBy: input.actorId, updatedAt: new Date() } },
        { new: true, session },
      ).lean();
      if (!site) throw new Error('SITE_NOT_FOUND');
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
  const colors = draft.tokens.visual.theme.colors;
  return Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--color-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`, value]));
}
