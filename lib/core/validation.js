import { z } from 'zod';

export const LeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  property: z.string().min(1, 'Property ID is required'),
  budget: z.number().min(0).default(0).optional(),
  timeframe: z.enum(['immediate', '1-3 months', '3-6 months', '6+ months', 'unknown']).default('unknown').optional(),
  source: z.string().default('organic').optional(),
  lastActivity: z.coerce.date().default(() => new Date()).optional(),
  engagementVelocity: z.number().default(0).optional(),
  reengagementHook: z.string().optional(),
  tags: z.array(z.string()).default([]).optional(),
  idxViewed: z.boolean().default(false).optional(),
  views: z.number().min(0).default(0).optional(),
  chatMinutes: z.number().min(0).default(0).optional(),
  tourRequested: z.boolean().default(false).optional(),
  jamieNotes: z.string().optional(),
  probability: z.number().min(0).max(100).default(50),
  status: z.enum(['new', 'contacted', 'closed', 'lost']).default('new'),
  leadCategory: z.enum(['Residential', 'RV']).default('Residential').optional(),
});

export const MessageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  property: z.string().min(1, 'Property ID is required'),
  recipient: z.string().min(1, 'Recipient ID is required'),
});

export const PropertySchema = z.object({
  type: z.string().min(1, 'Property type is required'),
  name: z.string().min(1, 'Property name is required'),
  description: z.string().optional(),
  location: {
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
  },
  beds: z.coerce.number().min(0, 'Beds must be at least 0'),
  baths: z.coerce.number().min(0, 'Baths must be at least 0'),
  square_feet: z.coerce.number().min(0, 'Square feet must be at least 0'),
  amenities: z.array(z.string()).optional(),
  rates: z.object({
    nightly: z.coerce.number().optional(),
    weekly: z.coerce.number().optional(),
    monthly: z.coerce.number().optional(),
  }),
  seller_info: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid seller email').optional().or(z.literal('')),
    phone: z.string().optional(),
  }),
  images: z.array(z.string()).optional(),
  owner: z.string().optional(),
});

export const OrderSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1, 'Item name is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price must be at least 0'),
  })).min(1, 'At least one item is required'),
  totalAmount: z.number().min(0, 'Total amount must be at least 0'),
  status: z.enum(['pending', 'cooking', 'completed', 'cancelled']).default('pending').optional(),
  user: z.string().optional(),
});

export const BookmarkSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
});
