import { describe, it, expect } from 'vitest';
import { TAHRetriever } from '@/lib/core/tah_retriever';
import fs from 'fs';
import path from 'path';

describe('TAHRetriever - Buffer Support', () => {
  const cartridgePath = path.resolve(__dirname, '../../cartridges/neighborhood_intel.tah');

  it('should load from a Buffer correctly', () => {
    if (!fs.existsSync(cartridgePath)) return;
    
    const buffer = fs.readFileSync(cartridgePath);
    const retriever = new TAHRetriever(buffer);
    
    expect(retriever).toBeDefined();
    // Dallas should be in there
    expect(retriever.containsKeyword('Dallas')).toBe(true);
  });

  it('should behave identically when loaded from Buffer vs File', () => {
    if (!fs.existsSync(cartridgePath)) return;
    
    const buffer = fs.readFileSync(cartridgePath);
    const retrieverBuffer = new TAHRetriever(buffer);
    const retrieverFile = new TAHRetriever(cartridgePath);
    
    const query = 'Dallas';
    const resBuffer = retrieverBuffer.search(query);
    const resFile = retrieverFile.search(query);
    
    expect(resBuffer).toEqual(resFile);
  });
});
