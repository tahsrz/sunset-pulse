export type TrecPromulgatedContract = {
  formName: string;
  formId: string;
  effectiveDate: string;
  summary?: string;
  useCase?: string;
};

// Source: Texas Real Estate Commission (TREC) Contracts page.
// Snapshot aligned to forms effective 07/01/2026 where applicable.
export const TREC_PROMULGATED_CONTRACTS: TrecPromulgatedContract[] = [
  {
    formName: 'One to Four Family Residential Contract (Resale)',
    formId: '20-19',
    effectiveDate: '2026-07-01',
    summary: 'Primary resale contract for most single-family residential transactions.',
    useCase: 'Residential resale transactions for one to four family properties.'
  },
  {
    formName: 'Unimproved Property Contract',
    formId: '9-18',
    effectiveDate: '2026-07-01',
    summary: 'Contract for land sales where property is unimproved.',
    useCase: 'Vacant land intended for one to four family residential use.'
  },
  {
    formName: 'New Home Contract (Incomplete Construction)',
    formId: '23-20',
    effectiveDate: '2026-07-01',
    summary: 'Contract form for builder sales when construction is not complete.',
    useCase: 'New-build transactions with incomplete construction at contract execution.'
  },
  {
    formName: 'New Home Contract (Completed Construction)',
    formId: '24-20',
    effectiveDate: '2026-07-01',
    summary: 'Contract form for new homes where construction is complete.',
    useCase: 'Builder or seller conveyance of completed new construction homes.'
  },
  {
    formName: 'Farm and Ranch Contract',
    formId: '25-17',
    effectiveDate: '2026-07-01',
    summary: 'Contract for agricultural, rural, or ranch property transactions.',
    useCase: 'Farm, ranch, and acreage sales with specialized land-use concerns.'
  },
  {
    formName: 'Residential Condominium Contract (Resale)',
    formId: '30-18',
    effectiveDate: '2026-07-01',
    summary: 'Resale contract form tailored to condominium transactions.',
    useCase: 'Residential condo resale transactions with condo-specific disclosures and documents.'
  },
  {
    formName: 'Amendment to Contract',
    formId: '39-11',
    effectiveDate: '2026-07-01',
    summary: 'Promulgated amendment form for modifying an executed contract.',
    useCase: 'Mutual changes to existing promulgated contract terms.'
  }
];

export const TREC_CONTRACT_ADDENDA: TrecPromulgatedContract[] = [
  { formName: "Addendum Concerning Right to Terminate Due to Lender's Appraisal", formId: '49-1', effectiveDate: '2019-03-01' },
  { formName: 'Addendum Containing Notice of Obligation to Pay Improvement District Assessment', formId: '53-0', effectiveDate: '2021-09-01' },
  { formName: 'Addendum for "Back-Up" Contract', formId: '11-9', effectiveDate: '2026-07-01' },
  { formName: 'Addendum for "Back-Up" Contract', formId: '11-8', effectiveDate: '2025-01-03' },
  { formName: 'Addendum for Authorizing Hydrostatic Testing', formId: '48-1', effectiveDate: '2020-03-01' },
  { formName: 'Addendum for Coastal Area Property', formId: '33-2', effectiveDate: '2011-12-05' },
  { formName: 'Addendum for Property in a Propane Gas System Service Area', formId: '47-0', effectiveDate: '2014-02-01' },
  { formName: 'Addendum for Property Located Seaward of the Gulf Intercoastal Waterway', formId: '34-4', effectiveDate: '2011-12-05' },
  { formName: 'Addendum for Property Subject to Mandatory Membership in a Property Owners Association', formId: '36-11', effectiveDate: '2026-07-01' },
  { formName: 'Addendum for Property Subject to Mandatory Membership in a Property Owners Association', formId: '36-10', effectiveDate: '2023-02-01' },
  { formName: "Addendum for Release of Liability on Assumed Loan and/or Restoration of Seller's VA Entitlement", formId: '12-3', effectiveDate: '2011-12-05' },
  { formName: 'Addendum for Reservation of Oil, Gas, and Other Minerals', formId: '44-3', effectiveDate: '2023-02-01' },
  { formName: 'Addendum for Sale of Other Property by Buyer', formId: '10-6', effectiveDate: '2011-12-05' },
  { formName: 'Addendum for Section 1031 Exchange', formId: '60-0', effectiveDate: '2025-01-03' },
  { formName: "Addendum for Seller's Disclosure of Information on Lead-Based Paint and Lead-Based Paint Hazards as Required by Federal Law", formId: '56-0', effectiveDate: '2026-05-28' },
  { formName: 'Addendum Regarding Fixture Leases', formId: '52-1', effectiveDate: '2023-02-01' },
  { formName: 'Addendum Regarding Residential Leases', formId: '51-1', effectiveDate: '2023-02-01' },
  { formName: "Buyer's Temporary Residential Lease", formId: '16-7', effectiveDate: '2026-01-05' },
  { formName: 'Environmental Assessment, Threatened of Endangered Species, and Wetlands Addendum', formId: '28-2', effectiveDate: '2011-12-05' },
  { formName: 'Loan Assumption Addendum', formId: '41-3', effectiveDate: '2023-02-01' },
  { formName: 'Non-Realty Items Addendum', formId: '57-0', effectiveDate: '2025-09-03' },
  { formName: 'Seller Financing Addendum', formId: '26-8', effectiveDate: '2023-02-01' },
  { formName: "Seller's Temporary Residential Lease", formId: '15-7', effectiveDate: '2026-01-05' },
  { formName: 'Short Sale Addendum', formId: '45-2', effectiveDate: '2021-04-01' },
  { formName: 'Third Party Financing Addendum', formId: '40-11', effectiveDate: '2025-01-03' }
];

export const TREC_OTHER_FORMS: TrecPromulgatedContract[] = [
  { formName: 'Condominium Resale Certificate', formId: '32-5', effectiveDate: '2024-11-25' },
  { formName: 'Disclosure of Relationship with Residential Service Company', formId: 'RSC-4', effectiveDate: '2023-06-11' },
  { formName: "Landlord's Floodplain and Flood Notice", formId: '54-1', effectiveDate: '2025-11-26' },
  { formName: "Notice of Buyer's Termination of Contract", formId: '38-8', effectiveDate: '2025-04-01' },
  { formName: "Notice of Seller's Termination of Contract", formId: '50-0', effectiveDate: '2018-08-13' },
  { formName: 'Notice to Prospective Buyer', formId: '58-0', effectiveDate: '2025-09-03' },
  { formName: 'Notice to Purchaser of Special Taxing or Assessment District', formId: '59-0', effectiveDate: '2024-02-12' },
  { formName: 'Property Inspection Report', formId: 'REI 7-6', effectiveDate: '2022-02-01' },
  { formName: "Seller's Disclosure about Groundwater and Surface Water Rights", formId: '61-0', effectiveDate: '2026-07-01' },
  { formName: "Seller's Disclosure Notice", formId: '55-1', effectiveDate: '2026-05-28' },
  { formName: `Seller's Notice to Buyer of Removal of Contingency Under Addendum for "Back-Up" Contract`, formId: '62-0', effectiveDate: '2026-05-28' },
  { formName: "Subdivision Information, Including Resale Certificate for Property Subject to Mandatory Membership in a Property Owners' Association", formId: '37-5', effectiveDate: '2014-02-10' }
];
