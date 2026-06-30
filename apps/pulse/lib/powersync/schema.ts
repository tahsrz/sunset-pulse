import { column, Schema, Table, type PowerSyncDatabase, type SyncStream } from '@powersync/web';

const properties = new Table({
  mls_id: column.text,
  name: column.text,
  type: column.text,
  description: column.text,
  street: column.text,
  city: column.text,
  state: column.text,
  zip: column.text,
  latitude: column.real,
  longitude: column.real,
  beds: column.integer,
  baths: column.real,
  sqft: column.integer,
  price: column.real,
  price_type: column.text,
  rates: column.text,
  amenities: column.text,
  images: column.text,
  image_url: column.text,
  source: column.text,
  listing_status: column.text,
  last_updated: column.text,
  is_demo: column.integer,
  is_featured: column.integer,
  display_public: column.integer,
  metadata: column.text,
}, {
  indexes: {
    location: ['latitude', 'longitude'],
    city: ['city'],
    mls: ['mls_id'],
    status: ['listing_status'],
  },
});

const collections = new Table({
  user_id: column.text,
  property_id: column.text,
  name: column.text,
  created_at: column.text,
}, { indexes: { owner: ['user_id'], property: ['property_id'] } });

const recent_property_views = new Table({
  user_id: column.text,
  property_id: column.text,
  viewed_at: column.text,
}, { indexes: { owner: ['user_id'], property: ['property_id'] } });

const saved_searches = new Table({
  user_id: column.text,
  name: column.text,
  criteria: column.text,
  created_at: column.text,
  updated_at: column.text,
}, { indexes: { owner: ['user_id'] } });

export const SunsetPowerSyncSchema = new Schema({
  properties,
  collections,
  recent_property_views,
  saved_searches,
});

export type SunsetPowerSyncDatabase = (typeof SunsetPowerSyncSchema)['types'];
export type LocalPropertyRow = SunsetPowerSyncDatabase['properties'];

export function sunsetSyncStreams(db: PowerSyncDatabase) {
  return {
    viewport(params: { north: number; south: number; east: number; west: number }): SyncStream {
      return db.syncStream('viewport_properties', params);
    },
    propertyDetail(propertyId: string): SyncStream {
      return db.syncStream('property_detail', { property_id: propertyId });
    },
  };
}
