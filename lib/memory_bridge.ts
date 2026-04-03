/**
 * Memory Bridge Utility
 * Manages the 3-layer memory system: Static, Dynamic, and Session.
 * Integrates user preferences into data queries using XML tagging.
 */

export type MemoryLayer = 'static' | 'dynamic' | 'session';

export interface UserPreferences {
  style?: string;
  location?: string;
  priceRange?: [number, number];
  vibe?: string;
  viewMode?: 'neural' | 'fiber';
}

class MemoryBridge {
  private static instance: MemoryBridge;

  private constructor() {}

  public static getInstance(): MemoryBridge {
    if (!MemoryBridge.instance) {
      MemoryBridge.instance = new MemoryBridge();
    }
    return MemoryBridge.instance;
  }

  /**
   * Saves a preference to a specific memory layer.
   */
  public save(layer: MemoryLayer, key: string, value: any): void {
    if (typeof window === 'undefined') return;

    const storage = layer === 'session' ? sessionStorage : localStorage;
    const current = JSON.parse(storage.getItem(`pulse_mem_${layer}`) || '{}');
    current[key] = value;
    storage.setItem(`pulse_mem_${layer}`, JSON.stringify(current));

    // If saving to session, update dynamic memory for cross-session learning
    if (layer === 'session') {
      this.updateDynamic(key, value);
    }
  }

  /**
   * Retrieves preferences from all layers, prioritized.
   */
  public getPreferences(): UserPreferences {
    if (typeof window === 'undefined') return {};

    const s = JSON.parse(sessionStorage.getItem('pulse_mem_session') || '{}');
    const d = JSON.parse(localStorage.getItem('pulse_mem_dynamic') || '{}');
    const st = JSON.parse(localStorage.getItem('pulse_mem_static') || '{}');

    return { ...st, ...d, ...s };
  }

  /**
   * Generates a context object for Jamie to recognize the user across sessions.
   */
  public getGreetingContext(): any {
    if (typeof window === 'undefined') return {};

    const prefs = this.getPreferences();
    const lastSession = JSON.parse(localStorage.getItem('pulse_mem_last_session') || '{}');
    
    return {
      userName: prefs.style || 'Commander', // style often holds the "identity" in this setup
      lastAction: lastSession.action || 'None',
      lastProperty: lastSession.property || 'None',
      sessionCount: parseInt(localStorage.getItem('pulse_mem_count') || '0'),
      isReturning: parseInt(localStorage.getItem('pulse_mem_count') || '0') > 0
    };
  }

  /**
   * Persists current session highlights to long-term memory.
   */
  public persistSessionHighlights(action: string, propertyName?: string): void {
    if (typeof window === 'undefined') return;

    const count = parseInt(localStorage.getItem('pulse_mem_count') || '0');
    localStorage.setItem('pulse_mem_count', (count + 1).toString());

    localStorage.setItem('pulse_mem_last_session', JSON.stringify({
      action,
      property: propertyName || 'Unknown Asset',
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Wraps a query with the XML metadata structure for Sanity/Data processing.
   */
  public wrapQuery(baseQuery: string, contextTitle: string = 'Standard Recon'): string {
    const prefs = this.getPreferences();
    const history = JSON.parse(sessionStorage.getItem('pulse_mem_history') || '[]');

    return `
<context>
  <title>${contextTitle}</title>
  <timestamp>${new Date().toISOString()}</timestamp>
</context>
<user_preferences>
  ${Object.entries(prefs).map(([k, v]) => `<pref key="${k}">${v}</pref>`).join('\n  ')}
</user_preferences>
<session_history>
  ${history.slice(-5).map((h: string) => `<entry>${h}</entry>`).join('\n  ')}
</session_history>
<query>
  ${baseQuery}
</query>
    `.trim();
  }

  /**
   * Internal logic to evolve dynamic memory based on session frequency.
   */
  private updateDynamic(key: string, value: any): void {
    const dynamic = JSON.parse(localStorage.getItem('pulse_mem_dynamic') || '{}');
    // Simple frequency/recency logic: replace for now, could be an aggregator
    dynamic[key] = value;
    localStorage.setItem('pulse_mem_dynamic', JSON.stringify(dynamic));
  }

  public logInteraction(action: string): void {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(sessionStorage.getItem('pulse_mem_history') || '[]');
    history.push(action);
    sessionStorage.setItem('pulse_mem_history', JSON.stringify(history));
  }
}

export const memoryBridge = MemoryBridge.getInstance();
