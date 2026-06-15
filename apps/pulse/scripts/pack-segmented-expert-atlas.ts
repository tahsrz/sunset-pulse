import { packSegmentedExpertAtlas } from '@/lib/core/segmented_expert_atlas';

const maxExperts = Number(process.env.EXPERT_ATLAS_MAX_EXPERTS || 400);
const segmentSize = Number(process.env.EXPERT_ATLAS_SEGMENT_SIZE || 16);
const baseName = process.env.EXPERT_ATLAS_BASE_NAME || 'segmented_expert_atlas';

const result = packSegmentedExpertAtlas({
  baseName,
  maxExperts,
  segmentSize
});

console.log(JSON.stringify({
  baseName: result.baseName,
  expertCount: result.expertCount,
  segmentCount: result.segmentCount,
  hatPath: result.hatPath,
  tahPath: result.tahPath,
  manifestPath: result.manifestPath,
  sources: result.sources
}, null, 2));
