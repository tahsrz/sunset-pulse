export type MatrixScalar = string | number | boolean | null | undefined;
export type MatrixFieldValue = string | string[];
export type MatrixPayload = Record<string, MatrixFieldValue>;

export interface PulseSearchFilters {
  location: string;
  priceMin: number | '';
  priceMax: number | '';
  bedsMin: number | '';
  bathsMin: number | '';
  propertySubTypes: string[];
  pool: 'Yes' | 'No' | '';
  acreageMin: number | '';
  acreageMax: number | '';
  keywords: string;
}

export type MatrixTargetFieldMap = {
  location: string;
  priceMin: string;
  priceMax: string;
  bedsMin: string;
  bathsMin: string;
  propertySubTypes: string;
  pool: string;
  acreageMin: string;
  acreageMax: string;
  keywords: string;
};

export const DEFAULT_PULSE_SEARCH_FILTERS: PulseSearchFilters = {
  location: '',
  priceMin: '',
  priceMax: '',
  bedsMin: '',
  bathsMin: '',
  propertySubTypes: [],
  pool: '',
  acreageMin: '',
  acreageMax: '',
  keywords: ''
};

export const PROPERTY_SUBTYPE_OPTIONS = [
  'Single Family Residence',
  'Condominium',
  'Townhouse',
  'Farm/Ranch',
  'Unimproved Land',
  'Manufactured Home',
  'Multi Family'
];

export const DEFAULT_MATRIX_TARGET_FIELDS: MatrixTargetFieldMap = {
  location: process.env.NEXT_PUBLIC_MATRIX_LOCATION_FIELD || 'Location_Input_Name',
  priceMin: process.env.NEXT_PUBLIC_MATRIX_PRICE_MIN_FIELD || 'PriceMin_Input_Name',
  priceMax: process.env.NEXT_PUBLIC_MATRIX_PRICE_MAX_FIELD || 'PriceMax_Input_Name',
  bedsMin: process.env.NEXT_PUBLIC_MATRIX_BEDS_MIN_FIELD || 'BedsMin_Input_Name',
  bathsMin: process.env.NEXT_PUBLIC_MATRIX_BATHS_MIN_FIELD || 'BathsMin_Input_Name',
  propertySubTypes: process.env.NEXT_PUBLIC_MATRIX_PROPERTY_SUBTYPE_FIELD || 'PropertySubType_Field',
  pool: process.env.NEXT_PUBLIC_MATRIX_POOL_FIELD || 'Pool_YN_Select',
  acreageMin: process.env.NEXT_PUBLIC_MATRIX_ACREAGE_MIN_FIELD || 'AcreageMin_Input_Name',
  acreageMax: process.env.NEXT_PUBLIC_MATRIX_ACREAGE_MAX_FIELD || 'AcreageMax_Input_Name',
  keywords: process.env.NEXT_PUBLIC_MATRIX_KEYWORDS_FIELD || 'Keywords_Input_Name'
};

export function normalizeMatrixScalar(value: MatrixScalar) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Y' : 'N';
  return String(value);
}

export function translateToLegacyFields(
  filters: PulseSearchFilters,
  targetFields: MatrixTargetFieldMap = DEFAULT_MATRIX_TARGET_FIELDS
): MatrixPayload {
  const payload: MatrixPayload = {};

  const addScalar = (fieldName: string, value: MatrixScalar) => {
    if (!fieldName) return;
    const normalized = normalizeMatrixScalar(value);
    payload[fieldName] = normalized;
  };

  const addArray = (fieldName: string, value: string[]) => {
    if (!fieldName) return;
    payload[fieldName] = value.filter(Boolean);
  };

  addScalar(targetFields.location, filters.location);
  addScalar(targetFields.priceMin, filters.priceMin);
  addScalar(targetFields.priceMax, filters.priceMax);
  addScalar(targetFields.bedsMin, filters.bedsMin);
  addScalar(targetFields.bathsMin, filters.bathsMin);
  addArray(targetFields.propertySubTypes, filters.propertySubTypes);
  addScalar(targetFields.pool, filters.pool);
  addScalar(targetFields.acreageMin, filters.acreageMin);
  addScalar(targetFields.acreageMax, filters.acreageMax);
  addScalar(targetFields.keywords, filters.keywords);

  return payload;
}

export function getMatrixOrigin(matrixUrl: string) {
  try {
    return new URL(matrixUrl).origin;
  } catch {
    return '';
  }
}
