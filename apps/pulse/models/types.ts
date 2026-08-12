export interface LeadDocument {
  _id: string;
  email?: string;
  name?: string;
  probability: number;
  lastActivity?: Date | string;
  updatedAt?: Date | string;
  toObject: () => Record<string, unknown> & {
    probability: number;
    lastActivity?: unknown;
    updatedAt?: unknown;
  };
}

export interface PropertyDocument {
  _id: string;
  owner?: string;
  name?: string;
  source?: string;
  display_public?: boolean;
  mls_id?: string;
  images?: unknown;
  image_url?: unknown;
}

export interface MenuItemDocument {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  isAvailable?: boolean;
}

export function formatMenuItemSummary(item: Pick<MenuItemDocument, 'name' | 'price'>): string {
  return `${item.name} ($${item.price})`;
}

export interface ViralAssetDocument {
  path: string;
}

export interface EntityDocument {
  uid: string;
  logic: {
    systemPrompt: string;
    modelId: string;
  };
}

export interface ValuationResult {
  _id: string;
  id?: string;
  address?: string;
  property_id?: string;
  propertyId?: string;
  value?: number;
  price?: number;
  confidence?: number;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  estimate?: number;
  features?: string[];
  ml_adjustments?: {
    confidence_score?: number;
    price_trend_index?: number;
  };
  location?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
}

export interface MapValuationResult extends ValuationResult {
  location_geo: {
    coordinates: [number, number];
  };
}

export interface PropertyComment {
  id: string;
  property_id: string;
  user_name?: string | null;
  content: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface PropertyCommentInsertPayload {
  new: PropertyComment;
  old?: PropertyComment;
}
