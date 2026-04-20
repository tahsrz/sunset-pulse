export interface CartItem {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
  [key: string]: any;
}

export interface Property {
  _id: string;
  name: string;
  type: string;
  description?: string;
  location: {
    street?: string;
    city: string;
    state: string;
    zipcode?: string;
  };
  beds: number;
  baths: number;
  square_feet: number;
  amenities?: string[];
  rates: {
    nightly?: number;
    weekly?: number;
    monthly?: number;
  };
  seller_info: {
    name?: string;
    email?: string;
    phone?: string;
  };
  images: string[];
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  // Intelligence Grid Additions
  leadCount?: number;
  globalAvgLeads?: number;
  source?: string;
  location_geo?: {
    type: 'Point';
    coordinates: [number, number];
  };
  rv_type?: string;
  rv_length?: number;
  hookups?: {
    electric: string;
  };
  listing_brokerage?: string;
  }
export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  property: string | Property;
  budget?: number;
  timeframe?: 'immediate' | '1-3 months' | '3-6 months' | '6+ months' | 'unknown';
  source?: string;
  lastActivity?: string | Date;
  engagementVelocity?: number;
  reengagementHook?: any;
  tags?: string[];
  idxViewed?: boolean;
  views?: number;
  chatMinutes?: number;
  tourRequested?: boolean;
  jamieNotes?: string;
  probability: number;
  status: 'new' | 'contacted' | 'closed' | 'lost';
  leadCategory?: 'Residential' | 'RV';
  createdAt?: string;
  updatedAt?: string;
  // UI Specific
  mongo?: boolean;
}
