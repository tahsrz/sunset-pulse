import { z } from 'zod';

export const sellerExampleSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['draft', 'published']),
  sampleLabel: z.string().trim().min(5).max(100),
  tasks: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(5).max(100),
    detail: z.string().trim().min(15).max(280),
  }).strict()).min(2).max(5),
  propertyPresentation: z.object({
    src: z.string().regex(/^\/images\/seller-examples\/[a-z0-9-]+\.webp$/),
    alt: z.string().trim().min(8).max(180),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    caption: z.string().trim().min(5).max(180),
  }).strict().optional(),
}).strict().superRefine((record, context) => {
  const ids = new Set<string>();
  record.tasks.forEach((task, index) => {
    if (ids.has(task.id)) context.addIssue({ code: 'custom', path: ['tasks', index, 'id'], message: 'Task IDs must be unique.' });
    ids.add(task.id);
  });
});

export type SellerExample = z.infer<typeof sellerExampleSchema>;
