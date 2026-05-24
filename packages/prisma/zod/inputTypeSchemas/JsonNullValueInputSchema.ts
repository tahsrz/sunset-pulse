import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));