'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_MATRIX_TARGET_FIELDS,
  DEFAULT_PULSE_SEARCH_FILTERS,
  type MatrixTargetFieldMap,
  type PulseSearchFilters,
  translateToLegacyFields
} from '@/lib/matrix/matrixMapper';

type FilterKey = keyof PulseSearchFilters;

export function useMatrixBridgeState(
  initialFilters: Partial<PulseSearchFilters> = {},
  targetFields: MatrixTargetFieldMap = DEFAULT_MATRIX_TARGET_FIELDS
) {
  const [filters, setFilters] = useState<PulseSearchFilters>({
    ...DEFAULT_PULSE_SEARCH_FILTERS,
    ...initialFilters
  });

  const legacyPayload = useMemo(
    () => translateToLegacyFields(filters, targetFields),
    [filters, targetFields]
  );

  const updateFilter = <Key extends FilterKey>(key: Key, value: PulseSearchFilters[Key]) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const togglePropertySubType = (subType: string) => {
    setFilters((current) => {
      const exists = current.propertySubTypes.includes(subType);
      return {
        ...current,
        propertySubTypes: exists
          ? current.propertySubTypes.filter((item) => item !== subType)
          : [...current.propertySubTypes, subType]
      };
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_PULSE_SEARCH_FILTERS);
  };

  return {
    filters,
    legacyPayload,
    updateFilter,
    togglePropertySubType,
    resetFilters,
    setFilters
  };
}
