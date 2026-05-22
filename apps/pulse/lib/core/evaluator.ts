/**
 * Metacircular Search Evaluator (SICP Edition)
 * Ported from SunsetWars PulseCommunicator.
 * Handles Lisp-style query expressions for TAH cartridges.
 */

import { TAHRetriever, TAHShard } from './tah_retriever';
import path from 'path';
import Property from '@/models/Property';
import connectDB from './database';
import fs from 'fs';
import { supabase } from '../supabase';

type LispExp = string | LispExp[];

// Warm Cache for TAH Buffers to minimize storage egress in production
const TAH_CACHE: Record<string, Buffer> = {};

export class SearchEvaluator {
  private env: Record<string, Function>;
  private cartridgeDir: string;

  constructor() {
    this.cartridgeDir = path.resolve(process.cwd(), 'cartridges');
    this.env = {
      'QUERY': this.primitiveQuery.bind(this),
      'EXISTS?': this.primitiveExists.bind(this),
      'VERSION': () => "TAH-EVAL v1.2 (TS)",
      'LIST-CARTRIDGES': this.listCartridges.bind(this),
      'SEARCH': this.primitiveSearch.bind(this),
      'HELP': this.help.bind(this)
    };
  }

  /**
   * Internal helper to retrieve cartridge buffer (Local with Cloud Fallback)
   */
  private async getCartridgeBuffer(cartridgeName: string): Promise<Buffer | null> {
    const fileName = cartridgeName.endsWith('.tah') ? cartridgeName : `${cartridgeName}.tah`;
    
    // 1. Check Cache
    if (TAH_CACHE[fileName]) return TAH_CACHE[fileName];

    // 2. Try Local File System
    const localPath = path.join(this.cartridgeDir, fileName);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      TAH_CACHE[fileName] = buffer;
      return buffer;
    }

    // 3. Fallback to Supabase Storage (Cloud)
    try {
      console.log(`🌐 [EVAL_FETCH] Downloading ${fileName} from grid storage...`);
      const { data, error } = await supabase.storage
        .from('cartridges')
        .download(fileName);
      
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        TAH_CACHE[fileName] = buffer;
        return buffer;
      }
    } catch (err) {
      console.error(`[EVAL_STORAGE_ERROR] Failed to retrieve ${fileName}:`, err);
    }

    return null;
  }

  /**
   * The core eval loop: eval(exp, env)
   */
  public async evaluate(exp: LispExp): Promise<any> {
    if (typeof exp === 'string') {
      // Atomic symbol/keyword
      const upperExp = exp.toUpperCase();
      return this.env[upperExp] !== undefined ? this.env[upperExp] : exp;
    } else if (!Array.isArray(exp)) {
      // Constant
      return exp;
    }

    // Procedure call: (operator operand1 operand2 ...)
    if (exp.length === 0) return null;

    const procedure = await this.evaluate(exp[0]);
    const args = await Promise.all(exp.slice(1).map(arg => this.evaluate(arg)));

    if (typeof procedure === 'function') {
      return await procedure(...args);
    }
    
    throw new Error(`Unknown procedure: ${exp[0]}`);
  }

  private async primitiveQuery(cartridgeName: string, terms: string): Promise<TAHShard[]> {
    const cleanCartridge = cartridgeName.replace(/['"]/g, '');
    const cleanTerms = terms.replace(/['"]/g, '');
    
    const buffer = await this.getCartridgeBuffer(cleanCartridge);
    if (!buffer) return [];

    const retriever = new TAHRetriever(buffer);
    return retriever.search(cleanTerms);
  }

  private async primitiveExists(cartridgeName: string, term: string): Promise<boolean> {
    const cleanCartridge = cartridgeName.replace(/['"]/g, '');
    const cleanTerm = term.replace(/['"]/g, '');
    
    const buffer = await this.getCartridgeBuffer(cleanCartridge);
    if (!buffer) return false;
    
    const retriever = new TAHRetriever(buffer);
    return retriever.containsKeyword(cleanTerm);
  }

  private async primitiveSearch(location: string, ...options: any[]) {
    console.log(`[EVAL] Executing SEARCH in ${location} with options:`, options);
    await connectDB();
    
    const query: any = {
      'location.city': { $regex: new RegExp(location, 'i') }
    };

    // Parse keywords/options
    for (let i = 0; i < options.length; i += 2) {
      const key = options[i];
      const val = options[i + 1];

      if (key === ':price-max') query['rates.monthly'] = { ...query['rates.monthly'], $lte: val };
      if (key === ':price-min') query['rates.monthly'] = { ...query['rates.monthly'], $gte: val };
      if (key === ':beds-min') query['beds'] = { $gte: val };
      if (key === ':baths-min') query['baths'] = { $gte: val };
    }

    const results = await Property.find(query).limit(10);
    return results;
  }

  private listCartridges(): string[] {
    if (!fs.existsSync(this.cartridgeDir)) return [];
    return fs.readdirSync(this.cartridgeDir)
      .filter((f: string) => f.endsWith('.tah'))
      .map((f: string) => f.replace('.tah', ''));
  }

  private help() {
    return [
      "(QUERY \"cartridge\" \"term\") - Search a TAH cartridge",
      "(EXISTS? \"cartridge\" \"term\") - Check Bloom filter membership",
      "(SEARCH \"city\" :price-max N :beds-min M) - Programmable property search",
      "(LIST-CARTRIDGES) - List active cartridges",
      "(VERSION) - Show evaluator version"
    ];
  }

  /**
   * Simple S-Expression Parser
   */
  public parse(s: string): LispExp {
    const tokens = s.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(t => t.length > 0);
    
    const readFromTokens = (tokens: string[]): LispExp => {
      if (tokens.length === 0) throw new Error("Unexpected EOF");
      
      const token = tokens.shift();
      if (token === '(') {
        const L: LispExp[] = [];
        while (tokens[0] !== ')') {
          L.push(readFromTokens(tokens) as LispExp);
        }
        tokens.shift(); // pop ')'
        return L;
      } else if (token === ')') {
        throw new Error("Unexpected )");
      } else {
        // Clean quotes from atoms
        if (token && (token.startsWith('"') || token.startsWith("'"))) {
           return token.slice(1, -1);
        }
        return token!;
      }
    };

    return readFromTokens(tokens);
  }
}

export const searchEvaluator = new SearchEvaluator();

