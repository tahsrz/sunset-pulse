/**
 * Memory Bridge Utility
 * Manages the 3-layer memory system: Static, Dynamic, and Session.
 * Integrates user preferences into data queries using XML tagging.
 */

import { createClient } from '@/utils/supabase/client';

export type MemoryLayer = 'static' | 'dynamic' | 'session' | 'core' | 'activity';

export interface UserPreferences {
  style?: string;
  location?: string;
  priceRange?: [number, number];
  vibe?: string;
  viewMode?: 'neural' | 'fiber';
}

class MemoryBridge {
  private static instance: MemoryBridge;
  private supabase = createClient();

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

    const storage = (layer === 'session' || layer === 'activity') ? sessionStorage : localStorage;
    const current = JSON.parse(storage.getItem(`pulse_mem_${layer}`) || '{}');
    current[key] = value;
    storage.setItem(`pulse_mem_${layer}`, JSON.stringify(current));

    // If saving to session, update dynamic memory for cross-session learning
    if (layer === 'session') {
      this.updateDynamic(key, value);
    }
  }

  /**
   * Synchronizes a single interaction to Supabase for cross-device persistence.
   */
  public async syncInteraction(role: string, content: string, metadata: any = {}): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      const { error } = await this.supabase.from('jamie_interactions').insert({
        user_id: user.id,
        role,
        content,
        metadata,
        timestamp: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      console.error('[MEMORY_BRIDGE_SYNC_ERROR]:', err);
    }
  }

  /**
   * Loads historical interactions from Supabase to hydrate local state sorted by timestamp
   */
  public async loadInteractions(): Promise<any[]> {
    if (typeof window === 'undefined') return [];

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('jamie_interactions')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Map database fields to the expected interaction format if different
        const mappedData = data.map(item => ({
          role: item.role,
          content: item.content,
          timestamp: item.timestamp,
          metadata: item.metadata
        }));
        localStorage.setItem('pulse_mem_history', JSON.stringify(mappedData));
        return mappedData;
      }
    } catch (err) {
      console.error('[MEMORY_BRIDGE_LOAD_ERROR]:', err);
    }
    return this.getHistory();
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
   * Generates a context object for the AI assistant to recognize the user across sessions.
   */
  public getGreetingContext(): any {
    if (typeof window === 'undefined') return {};

    const prefs = this.getPreferences();
    const lastSession = JSON.parse(localStorage.getItem('pulse_mem_last_session') || '{}');
    
    return {
      userName: prefs.style || 'User', // style often holds the "identity" in this setup
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
   * Categorized Logging: Core Insights (Key Decisions)
   */
  public logCoreInsight(insight: string, metadata?: any): void {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(localStorage.getItem('pulse_mem_core') || '[]');
    history.push({ insight, metadata, timestamp: new Date().toISOString() });
    localStorage.setItem('pulse_mem_core', JSON.stringify(history.slice(-20))); // Keep last 20 insights
  }

  /**
   * Categorized Logging: Activity Logs (System events)
   */
  public logActivityEvent(event: string, metadata?: any): void {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(sessionStorage.getItem('pulse_mem_activity') || '[]');
    history.push({ event, metadata, timestamp: new Date().toISOString() });
    sessionStorage.setItem('pulse_mem_activity', JSON.stringify(history.slice(-50))); // Keep last 50 session events
  }

  public getCoreInsights(): any[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('pulse_mem_core') || '[]');
  }

  public getActivityLogs(): any[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(sessionStorage.getItem('pulse_mem_activity') || '[]');
  }

  /**
   * Wraps a query with the XML metadata structure for Sanity/Data processing.
   */
  public wrapQuery(baseQuery: string, contextTitle: string = 'Standard Insights'): string {
    const prefs = this.getPreferences();
    const history = JSON.parse(localStorage.getItem('pulse_mem_history') || '[]');

    return `
<context>
  <title>${contextTitle}</title>
  <timestamp>${new Date().toISOString()}</timestamp>
</context>
<user_preferences>
  ${Object.entries(prefs).map(([k, v]) => `<pref key="${k}">${v}</pref>`).join('\n  ')}
</user_preferences>
<session_history>
  ${history.slice(-5).map((h: any) => `<entry>${typeof h === 'string' ? h : h.content}</entry>`).join('\n  ')}
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
    dynamic[key] = value;
    localStorage.setItem('pulse_mem_dynamic', JSON.stringify(dynamic));
  }

  public async logInteraction(action: any): Promise<void> {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(localStorage.getItem('pulse_mem_history') || '[]');
    history.push(action);
    localStorage.setItem('pulse_mem_history', JSON.stringify(history.slice(-50)));

    // Background sync to Supabase
    this.syncInteraction(action.role, action.content, action.metadata || {});
  }

  public getHistory(): any[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('pulse_mem_history') || '[]');
  }

  public clearHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pulse_mem_history');
    localStorage.removeItem('pulse_mem_core');
    sessionStorage.removeItem('pulse_mem_activity');
  }
}

export const memoryBridge = MemoryBridge.getInstance();
