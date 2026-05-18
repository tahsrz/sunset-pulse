import fs from 'fs';
import path from 'path';
import { TAHRetriever, TAHShard } from '@/lib/core/tah_retriever';

/**
 * Pulse Search (TypeScript Edition)
 * Optimized for Vercel/Next.js environment.
 * Searches all .tah cartridges in the cartridges directory and /tmp.
 */
export async function pulse_search(query: string): Promise<any[]> {
  const cartridgeDirs = [
    path.join(process.cwd(), 'cartridges'),
    '/tmp/cartridges', // Synced from Supabase
    '/tmp'
  ];

  const results: any[] = [];
  const processedFiles = new Set<string>();

  for (const dir of cartridgeDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tah'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (processedFiles.has(file)) continue;
      processedFiles.add(file);

      try {
        const retriever = new TAHRetriever(filePath);
        const matches = retriever.search(query);
        
        if (matches.length > 0) {
          matches.forEach(m => {
            results.push({
              source: file,
              text: m.data,
              score: 1.0 // TODO: Implement ranking if needed
            });
          });
        }
      } catch (err) {
        // console.error(`[PulseSearch] Error in ${file}:`, err);
      }
    }
  }

  return results;
}
