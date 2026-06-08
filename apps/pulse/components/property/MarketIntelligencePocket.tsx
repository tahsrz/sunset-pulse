import React from 'react';
import { fetchRentEstimate } from '@/lib/data/rentcast';
import MarketIntelligence from './MarketIntelligence';

interface MarketIntelligencePocketProps {
  address: string;
}

const MarketIntelligencePocket = async ({ address }: MarketIntelligencePocketProps) => {
  let rentData = null;
  try {
    rentData = await fetchRentEstimate(address);
  } catch (e) {
    console.error('Market analysis failed in pocket:', e);
  }

  if (!rentData) return null;

  return <MarketIntelligence rentData={rentData} />;
};

export default MarketIntelligencePocket;
