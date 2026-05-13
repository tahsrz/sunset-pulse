/**
 * Metacircular Search Evaluator (SICP Edition)
 * Ported from SunsetWars PulseCommunicator.
 * Handles Lisp-style query expressions for TAH cartridges.
 */

import { TAHRetriever, TAHShard } from './tah_retriever';
import path from 'path';

type LispExp = string | LispExp[];

export class SearchEvaluator {
  private env: Record<string, Function>;
  private cartridgeDir: string;

  constructor() {
    this.cartridgeDir = path.resolve(process.cwd(), 'cartridges');
    this.env = {
      'QUERY': this.primitiveQuery.bind(this),
      'VERSION': () => "TAH-EVAL v1.0 (TS)",
      'LIST-CARTRIDGES': this.listCartridges.bind(this)
    };
  }

  /**
   * The core eval loop: eval(exp, env)
   */
  public evaluate(exp: LispExp): any {
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

    const procedure = this.evaluate(exp[0]);
    const args = exp.slice(1).map(arg => this.evaluate(arg));

    if (typeof procedure === 'function') {
      return procedure(...args);
    }
    
    throw new Error(`Unknown procedure: ${exp[0]}`);
  }

  private primitiveQuery(cartridgeName: string, terms: string): TAHShard[] {
    const cleanCartridge = cartridgeName.replace(/['"]/g, '');
    const cleanTerms = terms.replace(/['"]/g, '');
    
    const cartridgePath = path.join(this.cartridgeDir, `${cleanCartridge}.tah`);
    const retriever = new TAHRetriever(cartridgePath);
    return retriever.search(cleanTerms);
  }

  private listCartridges(): string[] {
    const fs = require('fs');
    return fs.readdirSync(this.cartridgeDir)
      .filter((f: string) => f.endsWith('.tah'))
      .map((f: string) => f.replace('.tah', ''));
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
        return token!;
      }
    };

    return readFromTokens(tokens);
  }
}

export const searchEvaluator = new SearchEvaluator();
