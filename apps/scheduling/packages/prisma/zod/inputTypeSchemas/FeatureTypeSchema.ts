import { z } from 'zod';

export const FeatureTypeSchema = z.enum(['RELEASE','EXPERIMENT','OPERATIONAL','KILL_SWITCH','PERMISSION']);

export type FeatureTypeType = `${z.infer<typeof FeatureTypeSchema>}`

export default FeatureTypeSchema;
