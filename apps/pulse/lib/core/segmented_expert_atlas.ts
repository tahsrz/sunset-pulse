import fs from 'fs';
import path from 'path';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { listPulseCartridges, type PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { extractMemoriaTerms } from './memoria_builder';
import { extractTextShardsFromCartridge } from './tah_ingest';
import { cityHash64 } from './cityhash';
import { getTahIndices } from './tah_utils';

export const EXPERT_ATLAS_MAGIC = 0x21584145; // EAX!
export const EXPERT_ATLAS_VERSION = 1;
export const EXPERT_ATLAS_HEADER_SIZE = 128;
export const EXPERT_ATLAS_SEGMENT_SIZE = 128;
export const EXPERT_ATLAS_ENTRY_SIZE = 160;
export const EXPERT_ATLAS_BLOOM_BITS = 448n;
export const EXPERT_ATLAS_BLOOM_BYTES = 56;
export const EXPERT_ATLAS_BLOOM_HASHES = 4;

export interface ExpertShardInput {
  expertId?: number;
  title: string;
  source?: string;
  domainMask: bigint;
  regionId?: number;
  complexity?: number;
  density?: number;
  vitality?: number;
  relevance?: number;
  trust?: number;
  recency?: number;
  keywords?: string[];
  text: string;
}

export interface ExpertAtlasBuildOptions {
  segmentSize?: number;
  maxExperts?: number;
}

export interface ExpertAtlasSearchQuery {
  text: string;
  domainMask?: bigint;
  regionId?: number;
  targetComplexity?: number;
  minComplexity?: number;
  maxComplexity?: number;
  minRelevance?: number;
  minTrust?: number;
  minRecency?: number;
  topN?: number;
  maxSegments?: number;
  linkExpansionDepth?: number;
  linkExpansionLimit?: number;
}

export interface ExpertAtlasSearchResult {
  expertId: number;
  title: string;
  source: string;
  score: number;
  key: bigint;
  domainMask: bigint;
  regionId: number;
  complexity: number;
  density: number;
  vitality: number;
  relevance: number;
  trust: number;
  recency: number;
  conceptLinks: number[];
  concepts: string[];
  text: string;
}

export interface ExpertAtlasSearchDiagnostics {
  totalSegments: number;
  visitedSegments: number;
  rejectedSegments: number;
  candidateExperts: number;
  linkedExperts?: number;
  payloadReads: number;
  routeIndex: number;
}

export interface ExpertAtlasSearchResponse {
  results: ExpertAtlasSearchResult[];
  diagnostics: ExpertAtlasSearchDiagnostics;
}

export interface PackSegmentedExpertAtlasOptions {
  baseName?: string;
  outputDir?: string;
  cartridges?: PulseCartridge[];
  maxExperts?: number;
  segmentSize?: number;
}

export interface PackSegmentedExpertAtlasResult {
  baseName: string;
  outputDir: string;
  hatPath: string;
  tahPath: string;
  manifestPath: string;
  expertCount: number;
  segmentCount: number;
  sources: Array<{ slug: string; name: string; experts: number }>;
}

type ExpertMeta = {
  expertId: number;
  title: string;
  source: string;
  key: bigint;
  payloadOffset: bigint;
  payloadLength: number;
  domainMask: bigint;
  regionId: number;
  complexity: number;
  density: number;
  vitality: number;
  relevance: number;
  trust: number;
  recency: number;
  bloom: Buffer;
  keywordHash: bigint;
  conceptHash: bigint;
  concepts: string[];
  linkOffset: number;
  linkCount: number;
};

type SegmentMeta = {
  keyMin: bigint;
  keyMax: bigint;
  start: number;
  count: number;
  domainMaskUnion: bigint;
  minComplexity: number;
  maxComplexity: number;
  maxRelevance: number;
  maxTrust: number;
  maxRecency: number;
  maxVitality: number;
  bloomUnion: Buffer;
};

type QueryPlan = {
  text: string;
  terms: string[];
  key: bigint;
  domainMask: bigint;
  regionId: number;
  targetComplexity: number;
  minComplexity: number;
  maxComplexity: number;
  minRelevance: number;
  minTrust: number;
  minRecency: number;
  topN: number;
  maxSegments: number;
  linkExpansionDepth: number;
  linkExpansionLimit: number;
};

export class SegmentedExpertAtlasBuilder {
  private experts: ExpertShardInput[] = [];
  private segmentSize: number;
  private maxExperts: number;

  constructor(options: ExpertAtlasBuildOptions = {}) {
    this.segmentSize = Math.max(4, Math.floor(options.segmentSize || 16));
    this.maxExperts = Math.max(1, Math.floor(options.maxExperts || Number.MAX_SAFE_INTEGER));
  }

  public addExpert(expert: ExpertShardInput) {
    this.experts.push(expert);
  }

  public forge(): { hat: Buffer; tah: Buffer } {
    const payloads: Buffer[] = [];
    let payloadOffset = 0n;
    const expertMetas: ExpertMeta[] = [];
    const segmentPlans = this.experts.map((expert, index) => ({
      expert,
      index,
      segments: segmentByConceptAnchors(normalizeText(expert.text), expert.keywords)
    }));

    for (let depth = 0; expertMetas.length < this.maxExperts; depth++) {
      let selectedAtDepth = 0;

      for (const plan of segmentPlans) {
        if (expertMetas.length >= this.maxExperts) break;
        const segment = plan.segments[depth];
        if (!segment) continue;

        expertMetas.push(this.buildMeta(plan.expert, plan.index, depth, plan.segments.length, segment, payloadOffset));
        const payload = Buffer.concat([Buffer.from(segment.text, 'utf-8'), Buffer.from([0])]);
        payloads.push(payload);
        payloadOffset += BigInt(payload.length);
        selectedAtDepth++;
      }

      if (selectedAtDepth === 0) break;
    }

    expertMetas.sort((a, b) => compareBigInt(a.key, b.key) || a.expertId - b.expertId);

    const linkTable = buildRecursiveConceptLinks(expertMetas);
    const segments = buildSegments(expertMetas, this.segmentSize);
    const titleTable = Buffer.from(JSON.stringify(expertMetas.map(meta => ({
      expertId: meta.expertId,
      title: meta.title,
      source: meta.source,
      concepts: meta.concepts
    }))), 'utf-8');

    const segmentTable = Buffer.alloc(segments.length * EXPERT_ATLAS_SEGMENT_SIZE, 0);
    segments.forEach((segment, index) => writeSegment(segmentTable, index * EXPERT_ATLAS_SEGMENT_SIZE, segment));

    const expertTable = Buffer.alloc(expertMetas.length * EXPERT_ATLAS_ENTRY_SIZE, 0);
    expertMetas.forEach((meta, index) => writeExpert(expertTable, index * EXPERT_ATLAS_ENTRY_SIZE, meta));

    const header = Buffer.alloc(EXPERT_ATLAS_HEADER_SIZE, 0);
    const segmentOffset = EXPERT_ATLAS_HEADER_SIZE;
    const expertOffset = segmentOffset + segmentTable.length;
    const linkOffset = expertOffset + expertTable.length;
    const titleOffset = linkOffset + linkTable.length;

    header.writeUInt32LE(EXPERT_ATLAS_MAGIC, 0);
    header.writeUInt16LE(EXPERT_ATLAS_VERSION, 4);
    header.writeUInt32LE(expertMetas.length, 8);
    header.writeUInt32LE(segments.length, 12);
    header.writeUInt32LE(this.segmentSize, 16);
    header.writeBigUInt64LE(BigInt(segmentOffset), 24);
    header.writeBigUInt64LE(BigInt(expertOffset), 32);
    header.writeBigUInt64LE(BigInt(titleOffset), 40);
    header.writeUInt32LE(titleTable.length, 48);
    header.writeBigUInt64LE(BigInt(linkOffset), 56);
    header.writeUInt32LE(linkTable.length, 64);

    return {
      hat: Buffer.concat([header, segmentTable, expertTable, linkTable, titleTable]),
      tah: Buffer.concat(payloads)
    };
  }

  private buildMeta(
    expert: ExpertShardInput,
    expertIndex: number,
    segmentIndex: number,
    segmentCount: number,
    segment: ConceptSegment,
    payloadOffset: bigint
  ): ExpertMeta {
    const terms = buildExpertTerms(expert, segment.text, segment.concepts);
    const payloadLength = Buffer.byteLength(segment.text, 'utf-8') + 1;
    const density = clamp01(expert.density ?? calculateSemanticDensity(segment.text, segment.concepts));
    const vitality = clamp01(expert.vitality ?? calculateVitality(segment.text, segment.concepts));
    const metaBase = {
      domainMask: expert.domainMask,
      regionId: clampInt(expert.regionId ?? 0, 0, 1023),
      complexity: clamp01(expert.complexity ?? density),
      density,
      vitality,
      relevance: clamp01(expert.relevance ?? 0.75),
      trust: clamp01(expert.trust ?? 0.75),
      recency: clamp01(expert.recency ?? 0.5)
    };

    return {
      expertId: (expert.expertId ?? expertIndex + 1) * 1000 + segmentIndex,
      title: segmentCount > 1 ? `${expert.title} / ${segment.anchor}` : expert.title,
      source: expert.source || 'local://expert-atlas',
      key: buildExpertRouteKey(metaBase),
      payloadOffset,
      payloadLength,
      ...metaBase,
      bloom: buildBloom(terms),
      keywordHash: hashText(terms[0] || expert.title),
      conceptHash: hashText(segment.concepts.join('|') || segment.anchor || expert.title),
      concepts: segment.concepts,
      linkOffset: 0,
      linkCount: 0
    };
  }
}

export class SegmentedExpertAtlasRetriever {
  private hat: Buffer;
  private tah: Buffer;
  private expertCount: number;
  private segmentCount: number;
  private segmentSize: number;
  private segmentOffset: number;
  private expertOffset: number;
  private titleOffset: number;
  private titleLength: number;
  private linkOffset: number;
  private linkLength: number;
  private titleMap = new Map<number, { title: string; source: string; concepts: string[] }>();

  constructor(hatSource: string | Buffer, tahSource?: string | Buffer) {
    this.hat = Buffer.isBuffer(hatSource) ? hatSource : fs.readFileSync(hatSource);
    this.tah = Buffer.isBuffer(tahSource)
      ? tahSource
      : fs.readFileSync(tahSource || pairedTahPath(String(hatSource)));

    if (this.hat.readUInt32LE(0) !== EXPERT_ATLAS_MAGIC) {
      throw new Error('Invalid segmented expert atlas header.');
    }

    this.expertCount = this.hat.readUInt32LE(8);
    this.segmentCount = this.hat.readUInt32LE(12);
    this.segmentSize = this.hat.readUInt32LE(16);
    this.segmentOffset = Number(this.hat.readBigUInt64LE(24));
    this.expertOffset = Number(this.hat.readBigUInt64LE(32));
    this.titleOffset = Number(this.hat.readBigUInt64LE(40));
    this.titleLength = this.hat.readUInt32LE(48);
    this.linkOffset = Number(this.hat.readBigUInt64LE(56));
    this.linkLength = this.hat.readUInt32LE(64);
    this.loadTitleMap();
  }

  public search(query: ExpertAtlasSearchQuery): ExpertAtlasSearchResponse {
    const plan = this.buildQueryPlan(query);
    const routeIndex = this.findRouteSegment(plan.key);
    const selectedSegments = this.collectCandidateSegments(plan, routeIndex);
    const expertScores = new Map<number, number>();

    for (const segmentIndex of selectedSegments.indices) {
      const segment = this.readSegment(segmentIndex);
      for (let localIndex = 0; localIndex < segment.count; localIndex++) {
        const expertIndex = segment.start + localIndex;
        const meta = this.readExpert(expertIndex);
        if (!this.expertMatchesPlan(meta, plan)) continue;

        expertScores.set(expertIndex, this.scoreExpert(meta, plan));
      }
    }

    const rankedCandidates = [...expertScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(plan.topN * 4, plan.topN));
    const linkedCandidates = this.expandLinkedCandidates(rankedCandidates, plan);
    const candidates = [...rankedCandidates, ...linkedCandidates]
      .reduce((unique, candidate) => {
        const existing = unique.get(candidate[0]);
        if (!existing || candidate[1] > existing[1]) unique.set(candidate[0], candidate);
        return unique;
      }, new Map<number, [number, number]>())
      .values();

    let payloadReads = 0;
    const results: ExpertAtlasSearchResult[] = [];

    for (const [expertIndex, score] of Array.from(candidates).sort((a, b) => b[1] - a[1])) {
      const meta = this.readExpert(expertIndex);
      const text = this.readPayload(meta);
      payloadReads++;
      const label = this.titleMap.get(meta.expertId) || { title: `Expert ${meta.expertId}`, source: 'unknown', concepts: [] };

      const finalHaystack = [
        label.title,
        label.source,
        label.concepts.join(' '),
        text.slice(0, 1200)
      ].join(' ').toLowerCase();

      if (plan.terms.length && !plan.terms.some(term => finalHaystack.includes(term))) {
        continue;
      }

      results.push({
        expertId: meta.expertId,
        title: label.title,
        source: label.source,
        score,
        key: meta.key,
        domainMask: meta.domainMask,
        regionId: meta.regionId,
        complexity: meta.complexity,
        density: meta.density,
        vitality: meta.vitality,
        relevance: meta.relevance,
        trust: meta.trust,
        recency: meta.recency,
        conceptLinks: this.readLinks(meta),
        concepts: label.concepts,
        text
      });

      if (results.length >= plan.topN) break;
    }

    return {
      results,
      diagnostics: {
        totalSegments: this.segmentCount,
        visitedSegments: selectedSegments.visited,
        rejectedSegments: selectedSegments.rejected,
        candidateExperts: expertScores.size,
        linkedExperts: linkedCandidates.length,
        payloadReads,
        routeIndex
      }
    };
  }

  private buildQueryPlan(query: ExpertAtlasSearchQuery): QueryPlan {
    const terms = extractMemoriaTerms(query.text).slice(0, 12);
    const targetComplexity = clamp01(query.targetComplexity ?? 0.5);
    const domainMask = query.domainMask ?? domainMaskForLabel(query.text);
    const regionId = clampInt(query.regionId ?? 0, 0, 1023);

    return {
      text: query.text,
      terms,
      key: buildExpertRouteKey({
        domainMask,
        regionId,
        complexity: targetComplexity,
        relevance: clamp01(query.minRelevance ?? 0.6),
        trust: clamp01(query.minTrust ?? 0.5),
        recency: clamp01(query.minRecency ?? 0.5)
      }),
      domainMask,
      regionId,
      targetComplexity,
      minComplexity: clamp01(query.minComplexity ?? 0),
      maxComplexity: clamp01(query.maxComplexity ?? 1),
      minRelevance: clamp01(query.minRelevance ?? 0),
      minTrust: clamp01(query.minTrust ?? 0),
      minRecency: clamp01(query.minRecency ?? 0),
      topN: Math.max(1, query.topN ?? 5),
      maxSegments: Math.max(1, query.maxSegments ?? Math.ceil(Math.sqrt(Math.max(1, this.segmentCount))) + 2),
      linkExpansionDepth: clampInt(query.linkExpansionDepth ?? 1, 0, 3),
      linkExpansionLimit: clampInt(query.linkExpansionLimit ?? 8, 0, 64)
    };
  }

  private expandLinkedCandidates(seeds: Array<[number, number]>, plan: QueryPlan) {
    if (plan.linkExpansionDepth <= 0 || plan.linkExpansionLimit <= 0) return [];

    const linkedScores = new Map<number, number>();
    const seen = new Set<number>(seeds.map(([index]) => index));
    let frontier = seeds.slice(0, plan.topN * 2);

    for (let depth = 0; depth < plan.linkExpansionDepth && frontier.length > 0; depth++) {
      const nextFrontier: Array<[number, number]> = [];

      for (const [expertIndex, seedScore] of frontier) {
        const seedMeta = this.readExpert(expertIndex);
        const links = this.readLinks(seedMeta).slice(0, plan.linkExpansionLimit);

        for (const linkedIndex of links) {
          if (linkedIndex < 0 || linkedIndex >= this.expertCount || seen.has(linkedIndex)) continue;
          seen.add(linkedIndex);

          const meta = this.readExpert(linkedIndex);
          if (!this.linkedExpertMatchesPlan(meta, plan)) continue;

          const score = this.scoreLinkedExpert(meta, seedMeta, seedScore, plan, depth);
          linkedScores.set(linkedIndex, Math.max(linkedScores.get(linkedIndex) || 0, score));
          nextFrontier.push([linkedIndex, score]);

          if (linkedScores.size >= plan.linkExpansionLimit) break;
        }

        if (linkedScores.size >= plan.linkExpansionLimit) break;
      }

      frontier = nextFrontier;
    }

    return [...linkedScores.entries()];
  }

  private collectCandidateSegments(plan: QueryPlan, routeIndex: number) {
    const indices: number[] = [];
    let visited = 0;
    let rejected = 0;
    let lower = routeIndex;
    let upper = routeIndex + 1;

    while ((lower >= 0 || upper < this.segmentCount) && visited < plan.maxSegments) {
      const chooseLower = lower >= 0 && (upper >= this.segmentCount || segmentDistance(this.readSegment(lower), plan.key) <= segmentDistance(this.readSegment(upper), plan.key));
      const next = chooseLower ? lower-- : upper++;
      const segment = this.readSegment(next);
      visited++;

      if (this.segmentMatchesPlan(segment, plan)) {
        indices.push(next);
      } else {
        rejected++;
      }
    }

    return { indices, visited, rejected };
  }

  private findRouteSegment(key: bigint) {
    let low = 0;
    let high = this.segmentCount - 1;
    let best = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const segment = this.readSegment(mid);
      best = mid;

      if (key < segment.keyMin) {
        high = mid - 1;
      } else if (key > segment.keyMax) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    return clampInt(best, 0, Math.max(0, this.segmentCount - 1));
  }

  private segmentMatchesPlan(segment: SegmentMeta, plan: QueryPlan) {
    if ((segment.domainMaskUnion & plan.domainMask) === 0n) return false;
    if (segment.maxComplexity < plan.minComplexity || segment.minComplexity > plan.maxComplexity) return false;
    if (segment.maxRelevance < plan.minRelevance) return false;
    if (segment.maxTrust < plan.minTrust) return false;
    if (segment.maxRecency < plan.minRecency) return false;
    if (segment.maxVitality <= 0) return false;
    if (plan.terms.length && !plan.terms.some(term => bloomContains(segment.bloomUnion, term))) return false;
    return true;
  }

  private expertMatchesPlan(meta: ExpertMeta, plan: QueryPlan) {
    if ((meta.domainMask & plan.domainMask) === 0n) return false;
    if (meta.complexity < plan.minComplexity || meta.complexity > plan.maxComplexity) return false;
    if (meta.relevance < plan.minRelevance) return false;
    if (meta.trust < plan.minTrust) return false;
    if (meta.recency < plan.minRecency) return false;
    if (meta.vitality <= 0) return false;
    if (plan.terms.length && !plan.terms.some(term => bloomContains(meta.bloom, term))) return false;
    return true;
  }

  private linkedExpertMatchesPlan(meta: ExpertMeta, plan: QueryPlan) {
    if ((meta.domainMask & plan.domainMask) === 0n) return false;
    if (meta.complexity < plan.minComplexity || meta.complexity > plan.maxComplexity) return false;
    if (meta.relevance < Math.max(0, plan.minRelevance - 0.1)) return false;
    if (meta.trust < plan.minTrust) return false;
    if (meta.recency < Math.max(0, plan.minRecency - 0.1)) return false;
    if (meta.vitality <= 0) return false;
    return true;
  }

  private scoreExpert(meta: ExpertMeta, plan: QueryPlan) {
    const keyPenalty = Math.min(0.25, Number(absBigInt(meta.key - plan.key) % 100000n) / 400000);
    const complexityFit = 1 - Math.min(1, Math.abs(meta.complexity - plan.targetComplexity));
    const termHits = plan.terms.filter(term => bloomContains(meta.bloom, term)).length;

    return (
      meta.relevance * 40 +
      meta.trust * 25 +
      meta.recency * 10 +
      meta.vitality * 12 +
      meta.density * 10 +
      complexityFit * 15 +
      termHits * 8 -
      keyPenalty
    );
  }

  private scoreLinkedExpert(meta: ExpertMeta, seedMeta: ExpertMeta, seedScore: number, plan: QueryPlan, depth: number) {
    const sharedDomain = (meta.domainMask & seedMeta.domainMask) !== 0n ? 1 : 0;
    const complexityFit = 1 - Math.min(1, Math.abs(meta.complexity - plan.targetComplexity));
    const termHits = plan.terms.filter(term => bloomContains(meta.bloom, term)).length;
    const depthPenalty = depth * 8;

    return (
      seedScore * 0.55 +
      meta.vitality * 14 +
      meta.density * 12 +
      meta.trust * 12 +
      complexityFit * 10 +
      sharedDomain * 6 +
      termHits * 5 -
      depthPenalty
    );
  }

  private readSegment(index: number): SegmentMeta {
    const offset = this.segmentOffset + index * EXPERT_ATLAS_SEGMENT_SIZE;
    return {
      keyMin: this.hat.readBigUInt64LE(offset),
      keyMax: this.hat.readBigUInt64LE(offset + 8),
      start: this.hat.readUInt32LE(offset + 16),
      count: this.hat.readUInt32LE(offset + 20),
      domainMaskUnion: this.hat.readBigUInt64LE(offset + 24),
      minComplexity: this.hat.readFloatLE(offset + 32),
      maxComplexity: this.hat.readFloatLE(offset + 36),
      maxRelevance: this.hat.readFloatLE(offset + 40),
      maxTrust: this.hat.readFloatLE(offset + 44),
      maxRecency: this.hat.readFloatLE(offset + 48),
      maxVitality: this.hat.readFloatLE(offset + 52),
      bloomUnion: this.hat.slice(offset + 56, offset + 56 + EXPERT_ATLAS_BLOOM_BYTES)
    };
  }

  private readExpert(index: number): ExpertMeta {
    const offset = this.expertOffset + index * EXPERT_ATLAS_ENTRY_SIZE;
    return {
      expertId: this.hat.readUInt32LE(offset),
      title: '',
      source: '',
      domainMask: this.hat.readBigUInt64LE(offset + 8),
      key: this.hat.readBigUInt64LE(offset + 16),
      payloadOffset: this.hat.readBigUInt64LE(offset + 24),
      payloadLength: this.hat.readUInt32LE(offset + 32),
      complexity: this.hat.readFloatLE(offset + 36),
      relevance: this.hat.readFloatLE(offset + 40),
      trust: this.hat.readFloatLE(offset + 44),
      recency: this.hat.readFloatLE(offset + 48),
      vitality: this.hat.readFloatLE(offset + 52),
      density: this.hat.readFloatLE(offset + 56),
      regionId: this.hat.readUInt16LE(offset + 60),
      linkCount: this.hat.readUInt16LE(offset + 62),
      linkOffset: this.hat.readUInt32LE(offset + 64),
      bloom: this.hat.slice(offset + 72, offset + 72 + EXPERT_ATLAS_BLOOM_BYTES),
      keywordHash: this.hat.readBigUInt64LE(offset + 128),
      conceptHash: this.hat.readBigUInt64LE(offset + 136),
      concepts: []
    };
  }

  private readLinks(meta: ExpertMeta) {
    if (!meta.linkCount || this.linkLength <= 0) return [];
    const links: number[] = [];
    const start = this.linkOffset + meta.linkOffset;
    for (let index = 0; index < meta.linkCount; index++) {
      const offset = start + index * 4;
      if (offset + 4 > this.linkOffset + this.linkLength) break;
      links.push(this.hat.readUInt32LE(offset));
    }
    return links;
  }

  private readPayload(meta: ExpertMeta) {
    const start = Number(meta.payloadOffset);
    const data = this.tah.slice(start, start + meta.payloadLength);
    return data.toString('utf-8').replace(/\0+$/g, '').trim();
  }

  private loadTitleMap() {
    if (!this.titleLength) return;
    const raw = this.hat.slice(this.titleOffset, this.titleOffset + this.titleLength).toString('utf-8');
    const rows = JSON.parse(raw) as Array<{ expertId: number; title: string; source: string; concepts?: string[] }>;
    rows.forEach(row => this.titleMap.set(row.expertId, {
      title: row.title,
      source: row.source,
      concepts: row.concepts || []
    }));
  }
}

export function packSegmentedExpertAtlas(options: PackSegmentedExpertAtlasOptions = {}): PackSegmentedExpertAtlasResult {
  const baseName = safeBaseName(options.baseName || 'segmented_expert_atlas');
  const outputDir = path.resolve(options.outputDir || path.join(process.cwd(), 'cartridges', 'expert-atlas'));
  const maxExperts = Math.max(1, options.maxExperts ?? 400);
  const cartridges = options.cartridges || listPulseCartridges();
  const builder = new SegmentedExpertAtlasBuilder({ segmentSize: options.segmentSize, maxExperts });
  const sourceCounts = new Map<string, { slug: string; name: string; experts: number }>();
  let expertId = 1;
  const buckets = cartridges
    .map(cartridge => ({
      cartridge,
      shards: extractTextShardsFromCartridge(cartridge)
        .map(shard => ({ ...shard, text: normalizeText(shard.text) }))
        .filter(shard => shard.text.length > 0),
      cursor: 0
    }))
    .filter(bucket => bucket.shards.length > 0);

  while (expertId <= maxExperts && buckets.some(bucket => bucket.cursor < bucket.shards.length)) {
    for (const bucket of buckets) {
      if (expertId > maxExperts) break;
      if (bucket.cursor >= bucket.shards.length) continue;

      const shard = bucket.shards[bucket.cursor++];
      const { cartridge } = bucket;
      const text = shard.text;

      const stats = fs.statSync(cartridge.path);
      const recency = normalizeRecency(stats.mtimeMs);
      const nextSourceExpertIndex = (sourceCounts.get(cartridge.slug)?.experts ?? 0) + 1;
      const title = `${cartridge.title || cartridge.name} #${nextSourceExpertIndex}`;
      builder.addExpert({
        expertId,
        title,
        source: cartridge.name,
        domainMask: domainMaskForLabel(`${cartridge.slug} ${getCartridgeSearchQuery(cartridge)} ${text}`),
        regionId: inferRegionId(text),
        complexity: calculateComplexity(text),
        relevance: 0.7 + Math.min(0.25, (shard.meta || 0) / 1000),
        trust: cartridge.type === 'hat' ? 0.88 : 0.8,
        recency,
        keywords: extractMemoriaTerms(`${getCartridgeSearchQuery(cartridge)} ${text}`).slice(0, 12),
        text
      });

      const existing = sourceCounts.get(cartridge.slug) || { slug: cartridge.slug, name: cartridge.name, experts: 0 };
      existing.experts++;
      sourceCounts.set(cartridge.slug, existing);
      expertId++;
    }
  }

  const forged = builder.forge();
  fs.mkdirSync(outputDir, { recursive: true });

  const hatPath = path.join(outputDir, `${baseName}.hat`);
  const tahPath = path.join(outputDir, `${baseName}.tah`);
  const manifestPath = path.join(outputDir, `${baseName}.manifest.json`);
  fs.writeFileSync(hatPath, forged.hat);
  fs.writeFileSync(tahPath, forged.tah);

  const expertCount = forged.hat.readUInt32LE(8);
  const segmentCount = forged.hat.readUInt32LE(12);
  const titleOffset = Number(forged.hat.readBigUInt64LE(40));
  const titleLength = forged.hat.readUInt32LE(48);
  const sourceSlugByName = new Map([...sourceCounts.values()].map(source => [source.name, source.slug]));
  const sources = Array.from(
    (JSON.parse(forged.hat.slice(titleOffset, titleOffset + titleLength).toString('utf-8')) as Array<{ source: string }>)
      .reduce((counts, row) => counts.set(row.source, (counts.get(row.source) || 0) + 1), new Map<string, number>())
      .entries()
  ).map(([name, experts]) => ({
    slug: sourceSlugByName.get(name) || safeBaseName(name),
    name,
    experts
  }));
  const manifest = {
    name: baseName,
    format: 'segmented-expert-atlas-v1',
    generatedAt: new Date().toISOString(),
    expertCount,
    segmentCount,
    maxExperts,
    sources
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    baseName,
    outputDir,
    hatPath,
    tahPath,
    manifestPath,
    expertCount,
    segmentCount,
    sources
  };
}

export function domainMaskForLabel(label: string): bigint {
  const normalized = label.toLowerCase();
  const domains: Array<[RegExp, bigint]> = [
    [/architecture|cache|cpu|memory|simd|mapreduce|operating|compiler|unix/, 1n << 0n],
    [/pulse|idx|mls|listing|property|real estate|dallas|tarrant|texas/, 1n << 1n],
    [/security|zero trust|auth|jwt|crypto|guardian|abidan/, 1n << 2n],
    [/medical|health|clinical|diagnosis/, 1n << 3n],
    [/category|scheme|sicp|lisp|lambda/, 1n << 4n],
    [/visual|three|mapbox|raster|image|video/, 1n << 5n],
    [/grill|order|stripe|twilio|kds|phone/, 1n << 6n],
    [/runtime|combat|matrix|spell|unreal|zustand/, 1n << 7n]
  ];

  let mask = 0n;
  for (const [pattern, bit] of domains) {
    if (pattern.test(normalized)) mask |= bit;
  }

  if (mask !== 0n) return mask;
  const bucket = Number(hashText(normalized || 'general') % 32n);
  return 1n << BigInt(bucket);
}

function buildSegments(experts: ExpertMeta[], segmentSize: number): SegmentMeta[] {
  const segments: SegmentMeta[] = [];
  for (let start = 0; start < experts.length; start += segmentSize) {
    const slice = experts.slice(start, start + segmentSize);
    const bloomUnion = Buffer.alloc(EXPERT_ATLAS_BLOOM_BYTES, 0);
    let domainMaskUnion = 0n;

    slice.forEach(expert => {
      domainMaskUnion |= expert.domainMask;
      for (let index = 0; index < bloomUnion.length; index++) bloomUnion[index] |= expert.bloom[index];
    });

    segments.push({
      keyMin: slice[0].key,
      keyMax: slice[slice.length - 1].key,
      start,
      count: slice.length,
      domainMaskUnion,
      minComplexity: Math.min(...slice.map(expert => expert.complexity)),
      maxComplexity: Math.max(...slice.map(expert => expert.complexity)),
      maxRelevance: Math.max(...slice.map(expert => expert.relevance)),
      maxTrust: Math.max(...slice.map(expert => expert.trust)),
      maxRecency: Math.max(...slice.map(expert => expert.recency)),
      maxVitality: Math.max(...slice.map(expert => expert.vitality)),
      bloomUnion
    });
  }
  return segments;
}

function writeSegment(buffer: Buffer, offset: number, segment: SegmentMeta) {
  buffer.writeBigUInt64LE(segment.keyMin, offset);
  buffer.writeBigUInt64LE(segment.keyMax, offset + 8);
  buffer.writeUInt32LE(segment.start, offset + 16);
  buffer.writeUInt32LE(segment.count, offset + 20);
  buffer.writeBigUInt64LE(segment.domainMaskUnion, offset + 24);
  buffer.writeFloatLE(segment.minComplexity, offset + 32);
  buffer.writeFloatLE(segment.maxComplexity, offset + 36);
  buffer.writeFloatLE(segment.maxRelevance, offset + 40);
  buffer.writeFloatLE(segment.maxTrust, offset + 44);
  buffer.writeFloatLE(segment.maxRecency, offset + 48);
  buffer.writeFloatLE(segment.maxVitality, offset + 52);
  segment.bloomUnion.copy(buffer, offset + 56);
}

function writeExpert(buffer: Buffer, offset: number, meta: ExpertMeta) {
  buffer.writeUInt32LE(meta.expertId, offset);
  buffer.writeBigUInt64LE(meta.domainMask, offset + 8);
  buffer.writeBigUInt64LE(meta.key, offset + 16);
  buffer.writeBigUInt64LE(meta.payloadOffset, offset + 24);
  buffer.writeUInt32LE(meta.payloadLength, offset + 32);
  buffer.writeFloatLE(meta.complexity, offset + 36);
  buffer.writeFloatLE(meta.relevance, offset + 40);
  buffer.writeFloatLE(meta.trust, offset + 44);
  buffer.writeFloatLE(meta.recency, offset + 48);
  buffer.writeFloatLE(meta.vitality, offset + 52);
  buffer.writeFloatLE(meta.density, offset + 56);
  buffer.writeUInt16LE(meta.regionId, offset + 60);
  buffer.writeUInt16LE(meta.linkCount, offset + 62);
  buffer.writeUInt32LE(meta.linkOffset, offset + 64);
  meta.bloom.copy(buffer, offset + 72);
  buffer.writeBigUInt64LE(meta.keywordHash, offset + 128);
  buffer.writeBigUInt64LE(meta.conceptHash, offset + 136);
}

function buildExpertRouteKey(meta: {
  domainMask: bigint;
  regionId: number;
  complexity: number;
  relevance: number;
  trust: number;
  recency: number;
}) {
  const buckets = [
    domainBucket(meta.domainMask),
    clampInt(meta.regionId, 0, 1023),
    bucket10(meta.complexity),
    bucket10(meta.relevance),
    bucket10(meta.trust),
    bucket10(meta.recency)
  ];

  let key = 0n;
  for (let bit = 9; bit >= 0; bit--) {
    for (const bucket of buckets) {
      key = (key << 1n) | BigInt((bucket >> bit) & 1);
    }
  }
  return key;
}

type ConceptSegment = {
  anchor: string;
  concepts: string[];
  text: string;
};

export function segmentByConceptAnchors(text: string, seedConcepts: string[] = [], maxWords = 180): ConceptSegment[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+|(?=\b[A-Z][A-Z0-9_ ]{2,}:)/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  const segments: ConceptSegment[] = [];
  let current: string[] = [];
  let currentConcepts = new Set<string>();
  let currentAnchor = seedConcepts[0] || '';

  for (const sentence of sentences.length ? sentences : [normalized]) {
    const sentenceConcepts = extractConceptAnchors(sentence, seedConcepts);
    const nextAnchor = sentenceConcepts[0] || currentAnchor || 'general';
    const wordCount = countWords(current.join(' '));
    const nextCount = countWords(sentence);
    const overlap = conceptOverlap(currentConcepts, sentenceConcepts);
    const shouldStartNew =
      current.length > 0 &&
      (wordCount + nextCount > maxWords || (sentenceConcepts.length > 0 && overlap === 0 && wordCount > 45));

    if (shouldStartNew) {
      segments.push(finalizeConceptSegment(current, currentConcepts, currentAnchor || 'general'));
      current = [];
      currentConcepts = new Set<string>();
      currentAnchor = nextAnchor;
    }

    current.push(sentence);
    sentenceConcepts.forEach(concept => currentConcepts.add(concept));
    if (!currentAnchor) currentAnchor = nextAnchor;
  }

  if (current.length) {
    segments.push(finalizeConceptSegment(current, currentConcepts, currentAnchor || 'general'));
  }

  return segments.length ? segments : [{
    anchor: seedConcepts[0] || 'general',
    concepts: extractConceptAnchors(normalized, seedConcepts).slice(0, 8),
    text: normalized
  }];
}

function finalizeConceptSegment(sentences: string[], concepts: Set<string>, anchor: string): ConceptSegment {
  const text = normalizeText(sentences.join(' '));
  const fallbackConcepts = extractConceptAnchors(text, [anchor]);
  const conceptList = Array.from(concepts.size ? concepts : new Set(fallbackConcepts)).slice(0, 12);

  return {
    anchor: conceptList[0] || anchor,
    concepts: conceptList,
    text
  };
}

function extractConceptAnchors(text: string, seeds: string[] = []) {
  const terms = extractMemoriaTerms(text)
    .filter(term => isConceptTerm(term))
    .sort((a, b) => conceptWeight(b, text) - conceptWeight(a, text))
    .slice(0, 10);

  return Array.from(new Set([
    ...seeds.map(seed => seed.toLowerCase().trim()).filter(Boolean),
    ...terms
  ])).slice(0, 12);
}

function isConceptTerm(term: string) {
  if (term.length < 4) return false;
  if (/^\d+$/.test(term)) return false;
  if (term.includes(' ')) return true;
  return /[a-z]/.test(term) && !/^(this|that|from|into|onto|their|there|general|rules|common)$/.test(term);
}

function conceptWeight(term: string, text: string) {
  const normalized = text.toLowerCase();
  const occurrences = normalized.split(term).length - 1;
  const phraseBoost = term.includes(' ') ? 2.0 : 1.0;
  const lengthBoost = Math.min(2.0, term.length / 12);
  return occurrences * phraseBoost + lengthBoost;
}

function conceptOverlap(current: Set<string>, next: string[]) {
  if (!current.size || !next.length) return 0;
  return next.filter(concept => current.has(concept)).length;
}

function calculateSemanticDensity(text: string, concepts: string[]) {
  const wordCount = Math.max(1, countWords(text));
  const termCount = extractMemoriaTerms(text).length;
  const conceptHits = concepts.reduce((count, concept) => count + (text.toLowerCase().includes(concept) ? 1 : 0), 0);
  return clamp01((termCount / wordCount) * 0.65 + (conceptHits / Math.max(1, concepts.length)) * 0.35);
}

function calculateVitality(text: string, concepts: string[]) {
  const wordCount = Math.max(1, countWords(text));
  const density = calculateSemanticDensity(text, concepts);
  const anchorStrength = Math.min(1, concepts.length / 8);
  const connectiveCount = (text.match(/\b(because|therefore|enables|requires|links|drives|prevents|routes|maps|yields)\b/gi) || []).length;
  const connectiveScore = Math.min(1, connectiveCount / 4);
  const sizeScore = Math.min(1, wordCount / 80);

  return clamp01(density * 0.45 + anchorStrength * 0.25 + connectiveScore * 0.15 + sizeScore * 0.15);
}

function buildRecursiveConceptLinks(experts: ExpertMeta[]) {
  const linkBuffers: Buffer[] = [];
  const conceptIndex = new Map<string, number[]>();

  experts.forEach((expert, index) => {
    expert.concepts.forEach(concept => {
      const peers = conceptIndex.get(concept) || [];
      peers.push(index);
      conceptIndex.set(concept, peers);
    });
  });

  experts.forEach((expert, index) => {
    const links = new Set<number>();

    for (let jump = 1; jump < experts.length; jump *= 2) {
      if (index - jump >= 0) links.add(index - jump);
      if (index + jump < experts.length) links.add(index + jump);
    }

    expert.concepts.forEach(concept => {
      const peers = conceptIndex.get(concept) || [];
      peers
        .filter(peer => peer !== index)
        .sort((a, b) => Math.abs(a - index) - Math.abs(b - index))
        .slice(0, 3)
        .forEach(peer => links.add(peer));
    });

    const sortedLinks = Array.from(links).sort((a, b) => a - b).slice(0, 24);
    expert.linkOffset = linkBuffers.reduce((total, buffer) => total + buffer.length, 0);
    expert.linkCount = sortedLinks.length;

    const buffer = Buffer.alloc(sortedLinks.length * 4, 0);
    sortedLinks.forEach((link, linkIndex) => buffer.writeUInt32LE(link, linkIndex * 4));
    linkBuffers.push(buffer);
  });

  return Buffer.concat(linkBuffers);
}

function buildExpertTerms(expert: ExpertShardInput, text: string, concepts: string[] = []) {
  return Array.from(new Set([
    ...(expert.keywords || []),
    ...concepts,
    expert.title,
    ...(expert.source ? [expert.source] : []),
    ...extractMemoriaTerms(text).slice(0, 32)
  ].map(term => term.toLowerCase().trim()).filter(Boolean)));
}

function buildBloom(terms: string[]) {
  const bloom = Buffer.alloc(EXPERT_ATLAS_BLOOM_BYTES, 0);
  for (const term of terms) {
    for (const idx of getTahIndices(term, EXPERT_ATLAS_BLOOM_BITS, EXPERT_ATLAS_BLOOM_HASHES)) {
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);
      bloom[byteIdx] |= (1 << bitIdx);
    }
  }
  return bloom;
}

function bloomContains(bloom: Buffer, term: string) {
  for (const idx of getTahIndices(term, EXPERT_ATLAS_BLOOM_BITS, EXPERT_ATLAS_BLOOM_HASHES)) {
    const byteIdx = Number(idx / 8n);
    const bitIdx = Number(idx % 8n);
    if (byteIdx >= bloom.length || (bloom[byteIdx] & (1 << bitIdx)) === 0) return false;
  }
  return true;
}

function hashText(value: string) {
  return cityHash64(Buffer.from(value.toLowerCase().trim(), 'utf-8'));
}

function domainBucket(mask: bigint) {
  if (mask === 0n) return 0;
  for (let index = 0; index < 64; index++) {
    if ((mask & (1n << BigInt(index))) !== 0n) return index & 1023;
  }
  return 0;
}

function bucket10(value: number) {
  return clampInt(Math.round(clamp01(value) * 1023), 0, 1023);
}

function calculateComplexity(text: string) {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  return clamp01(new Set(words).size / words.length);
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeText(text: string) {
  return text.replace(/\0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeRecency(ms: number) {
  const ageDays = Math.max(0, (Date.now() - ms) / 86400000);
  return clamp01(1 / (1 + ageDays / 90));
}

function inferRegionId(text: string) {
  const lower = text.toLowerCase();
  if (/dallas|tarrant|texas|ntreis/.test(lower)) return 1;
  if (/california|san francisco|los angeles/.test(lower)) return 2;
  if (/japan|tokyo/.test(lower)) return 103;
  return 0;
}

function segmentDistance(segment: SegmentMeta, key: bigint) {
  if (key < segment.keyMin) return segment.keyMin - key;
  if (key > segment.keyMax) return key - segment.keyMax;
  return 0n;
}

function compareBigInt(a: bigint, b: bigint) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function absBigInt(value: bigint) {
  return value < 0n ? -value : value;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function pairedTahPath(hatPath: string) {
  return hatPath.endsWith('.hat') ? `${hatPath.slice(0, -4)}.tah` : hatPath;
}

function safeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'segmented_expert_atlas';
}
