import { TAHBuilder, TAHInput } from '../lib/core/tah_builder';
import { sessionForge } from '../lib/intelligence/sessionForge';
import fs from 'fs';
import path from 'path';

/**
 * Texas Promulgated Contracts Forge
 * Forges the texas_contracts_expertise.tah expertise cartridge.
 * Contains deterministic knowledge about TREC standard forms for Abidan analysis.
 */

async function forgeTexasContracts() {
  console.log('⚒️ [LEGAL_FORGE] Initiating Texas Promulgated Contracts Simulation...');

  const contractData: TAHInput[] = [
    {
      keywords: ['ONE TO FOUR', 'RESALE', 'FORM 20-19', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 20-19 | NAME: One to Four Family Residential Contract (Resale) | USE: Most common resale contract. | KEY_CLAUSE: Paragraph 7 (Property Condition), Paragraph 23 (Termination Option). | VULNERABILITY: Failure to deliver option fee within 3 days.'
    },
    {
      keywords: ['UNIMPROVED PROPERTY', 'LAND', 'FORM 9-18', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 9-18 | NAME: Unimproved Property Contract | USE: Vacant land with no structures. | KEY_CLAUSE: Paragraph 7G (Environmental Matters). | VULNERABILITY: Zoning changes or environmental hazards not disclosed.'
    },
    {
      keywords: ['NEW HOME INCOMPLETE', 'CONSTRUCTION', 'FORM 23-20', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 23-20 | NAME: New Home Contract (Incomplete Construction) | USE: Homes under construction by a builder. | KEY_CLAUSE: Paragraph 7 (Property Condition/Inspections), Paragraph 13 (Prerations). | VULNERABILITY: Construction delays and material cost escalations.'
    },
    {
      keywords: ['NEW HOME COMPLETED', 'READY', 'FORM 24-20', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 24-20 | NAME: New Home Contract (Completed Construction) | USE: New homes ready for move-in. | KEY_CLAUSE: Paragraph 7 (Warranties). | VULNERABILITY: Undiscovered construction defects in new builds.'
    },
    {
      keywords: ['FARM AND RANCH', 'ACREAGE', 'FORM 25-17', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 25-17 | NAME: Farm and Ranch Contract | USE: Rural properties with agricultural use. | KEY_CLAUSE: Paragraph 2 (Improvements/Accessories), Paragraph 6G (Exception Documents). | VULNERABILITY: Water rights, mineral rights, and ag-exemptions.'
    },
    {
      keywords: ['CONDOMINIUM', 'RESALE', 'FORM 30-18', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 30-18 | NAME: Residential Condominium Contract (Resale) | USE: Condominium units. | KEY_CLAUSE: Paragraph 2 (Property/Common Elements), Paragraph 22 (Agreement of Parties). | VULNERABILITY: HOA fees, resale certificates, and community rules.'
    },
    {
      keywords: ['AMENDMENT', 'FORM 39-11', 'GADRAEL', 'CONTRACT'],
      data: 'FORM: TREC 39-11 | NAME: Amendment to Contract | USE: Modifies terms of an executed contract by agreement of parties. | KEY_CLAUSE: Amendment effective upon signatures and delivery requirements in contract. | VULNERABILITY: Incomplete or conflicting amendment language can create enforceability disputes.'
    },
    {
      keywords: ['TERMINATION OPTION', 'PARAGRAPH 23', 'OPTION FEE', 'CONTRACT'],
      data: 'RULE: Paragraph 23 of TREC 20-19 allows buyer to terminate for any reason within a specified period. | REQUIREMENT: Option fee must be delivered to seller or agent within 3 days of effective date. | CONSEQUENCE: Late delivery forfeits the unrestricted right to terminate.'
    },
    {
      keywords: ['FINANCING ADDENDUM', 'THIRD PARTY', 'FORM 40-11', 'CONTRACT'],
      data: 'FORM: TREC 40-11 | NAME: Third Party Financing Addendum | USE: When buyer is obtaining a loan. | KEY_CLAUSE: Paragraph 2 (Approval of Financing). | VULNERABILITY: Time-sensitive "Notice of Buyer\'s Termination" if loan is not approved.'
    }
  ];

  // 1. Forge the cartridge buffer
  const builder = new TAHBuilder(0.001, 14);
  const buffer = builder.forge(contractData);
  
  // Save locally first
  const localPath = path.join(process.cwd(), 'cartridges/texas_contracts_expertise.tah');
  fs.writeFileSync(localPath, buffer);
  console.log(`💾 [LEGAL_FORGE] Local copy saved to ${localPath}`);

  // 2. Attempt Cloud Deployment (Ozriel Protocol Audit via SessionForge)
  console.log('🛡️ [LEGAL_FORGE] Attempting cloud deployment via SessionForge...');
  await sessionForge.forgeSessionCartridge('texas_contracts_expertise', contractData);
}

forgeTexasContracts();
