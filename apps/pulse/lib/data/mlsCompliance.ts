type UnknownRecord = Record<string, any>;

export const RESTRICTED_MLS_FIELD_PATTERNS = [
  /private/i,
  /showing/i,
  /lockbox/i,
  /access.?code/i,
  /gate.?code/i,
  /alarm.?code/i,
  /agent.?email/i,
  /agent.?phone/i,
  /broker.?phone/i,
  /compensation/i,
  /commission/i,
  /contact/i,
  /remarks.?private/i,
];

const PUBLIC_PROPERTY_FIELDS = new Set([
  '_id',
  'name',
  'type',
  'description',
  'location',
  'location_geo',
  'beds',
  'baths',
  'square_feet',
  'amenities',
  'price',
  'rates',
  'images',
  'source',
  'mls_id',
  'listing_status',
  'last_updated',
  'metadata',
]);

const PUBLIC_METADATA_FIELDS = new Set([
  'provider',
  'resource',
  'standardStatus',
  'listDate',
  'modificationTimestamp',
  'photoCount',
]);

export function isRestrictedMlsField(fieldName: string): boolean {
  return RESTRICTED_MLS_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function stripRestrictedFields(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stripRestrictedFields);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce<UnknownRecord>((safe, [key, nestedValue]) => {
    if (!isRestrictedMlsField(key)) {
      safe[key] = stripRestrictedFields(nestedValue);
    }
    return safe;
  }, {});
}

export function findRestrictedMlsFields(value: any, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findRestrictedMlsFields(item, `${prefix}[${index}]`));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const nestedMatches = findRestrictedMlsFields(nestedValue, path);
    return isRestrictedMlsField(key) ? [path, ...nestedMatches] : nestedMatches;
  });
}

export function sanitizeMlsForPublicUse(property: UnknownRecord): UnknownRecord {
  const stripped = stripRestrictedFields(property);

  return Object.entries(stripped).reduce<UnknownRecord>((safe, [key, value]) => {
    if (!PUBLIC_PROPERTY_FIELDS.has(key)) {
      return safe;
    }

    if (key === 'metadata' && value && typeof value === 'object' && !Array.isArray(value)) {
      safe.metadata = Object.entries(value).reduce<UnknownRecord>((metadata, [metadataKey, metadataValue]) => {
        if (PUBLIC_METADATA_FIELDS.has(metadataKey) && !isRestrictedMlsField(metadataKey)) {
          metadata[metadataKey] = stripRestrictedFields(metadataValue);
        }
        return metadata;
      }, {});
      return safe;
    }

    safe[key] = value;
    return safe;
  }, {});
}

export function sanitizeMlsForTahInput(property: UnknownRecord): UnknownRecord {
  const publicProperty = sanitizeMlsForPublicUse(property);

  return {
    mls_id: publicProperty.mls_id,
    city: publicProperty.location?.city,
    state: publicProperty.location?.state,
    type: publicProperty.type,
    beds: publicProperty.beds,
    baths: publicProperty.baths,
    square_feet: publicProperty.square_feet,
    price: publicProperty.rates?.monthly,
    listing_status: publicProperty.listing_status,
    last_updated: publicProperty.last_updated,
  };
}
