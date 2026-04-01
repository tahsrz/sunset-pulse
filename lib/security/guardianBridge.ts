import { execSync } from 'child_process';
import path from 'path';

export interface GuardianResponse {
  status: 'BLOCKED' | 'RESOLVED_BY_MINI' | 'ESCALATE';
  response?: string;
  query?: string;
  analysis: {
    is_malicious: boolean;
    risk_score: number;
    threats: string[];
  };
  message?: string;
}

export class GuardianBridge {
  private static pythonPath = 'python'; // Ensure python is in your PATH
  private static scriptPath = path.join(process.cwd(), 'utils/security/guardian.py');

  /**
   * Scans a query using the Python Guardian utility.
   */
  static scan(query: string): GuardianResponse {
    try {
      // Escape double quotes for shell execution
      const escapedQuery = query.replace(/"/g, '\\"');
      const command = `${this.pythonPath} "${this.scriptPath}" "${escapedQuery}"`;
      
      const output = execSync(command, { encoding: 'utf8' });
      return JSON.parse(output) as GuardianResponse;
    } catch (error) {
      console.error('Guardian Bridge Error:', error);
      return {
        status: 'ESCALATE', // Default to escalation on bridge failure for safety
        analysis: { is_malicious: false, risk_score: 0, threats: [] },
        message: 'Security bridge failure. Proceed with caution.'
      };
    }
  }
}
