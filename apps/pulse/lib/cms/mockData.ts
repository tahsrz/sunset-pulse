export type CmsConnectorStatus = 'online' | 'degraded' | 'offline';

export type CmsTransaction = {
  id: string;
  journalSequence: string;
  transactionSetId: string;
  terminalBatch: string;
  registerId: string;
  tillId: string;
  cashier: string;
  completedAt: string;
  department: string;
  plu?: string;
  subtotal: number;
  tax: number;
  total: number;
  tender: 'Cash' | 'Credit' | 'Debit' | 'EBT' | 'Fleet' | 'Lotto';
  paymentNetwork?: 'Viper' | 'Cash Drawer' | 'Lottery Terminal' | 'House Account';
  itemCount: number;
  flags: Array<'void' | 'refund' | 'age-restricted' | 'fuel-prepay' | 'fuel-prepay-completion' | 'rollback'>;
};

export type CmsDepartment = {
  name: string;
  netSales: number;
  transactionCount: number;
  marginHint: 'high' | 'medium' | 'low' | 'unknown';
};

export type CmsRegister = {
  id: string;
  label: string;
  status: CmsConnectorStatus;
  lastHeartbeat: string;
  openShift: string;
  tillId: string;
  terminalBatch: string;
  drawerExpected: number;
};

export type CmsSyncRun = {
  id: string;
  source: string;
  tool: 'Report Navigator' | 'Transaction Manager' | 'Journal Browser' | 'PDK Export';
  command?: string;
  schema?: string;
  status: CmsConnectorStatus;
  startedAt: string;
  completedAt: string;
  recordsPulled: number;
  recordsAccepted: number;
  warningCount: number;
};

export type CmsConfig = {
  siteName: string;
  siteController: string;
  controllerIp: string;
  baseVersion: string;
  mode: 'read-only' | 'staged-write' | 'live-write';
  pollingIntervalSeconds: number;
  connectorRuntime: 'python' | 'ruby' | 'node';
  allowedExports: string[];
};

export type CmsControllerCore = {
  name: 'Store Control' | 'Forecourt Control' | 'EPS Payment' | 'Services';
  status: CmsConnectorStatus;
  responsibility: string;
  lastCheck: string;
};

export type CmsTenderSummary = {
  tender: string;
  count: number;
  amount: number;
  settlementState: 'open' | 'balanced' | 'review';
};

export type CmsFuelPosition = {
  id: string;
  dispenser: string;
  status: CmsConnectorStatus;
  currentMode: 'idle' | 'authorized' | 'fueling' | 'offline';
  lastSaleGallons: number;
  lastSaleAmount: number;
};

export type CmsJournalEvent = {
  sequence: string;
  source: 'Register' | 'Forecourt' | 'EPS' | 'Services';
  level: 'info' | 'warning' | 'error';
  occurredAt: string;
  message: string;
};

const now = new Date('2026-05-29T16:45:00-05:00');

const isoMinutesAgo = (minutes: number) => {
  const date = new Date(now);
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

export const cmsConfig: CmsConfig = {
  siteName: 'Sunset Gas & Grill',
  siteController: 'RubyCi-14-104',
  controllerIp: '192.168.1.104',
  baseVersion: 'Commander/RubyCi SMS 2.x mock',
  mode: 'read-only',
  pollingIntervalSeconds: 300,
  connectorRuntime: 'python',
  allowedExports: ['transset-tlog', 'department-sales', 'tender-summary', 'cashier-shifts', 'plu-catalog', 'journal-browser'],
};

export const cmsCores: CmsControllerCore[] = [
  {
    name: 'Store Control',
    status: 'online',
    responsibility: 'POS terminals, item files, promotions, shift close',
    lastCheck: isoMinutesAgo(2),
  },
  {
    name: 'Forecourt Control',
    status: 'online',
    responsibility: 'Dispenser/DCR communications and fuel position state',
    lastCheck: isoMinutesAgo(3),
  },
  {
    name: 'EPS Payment',
    status: 'online',
    responsibility: 'Viper payment network reporting and terminal batches',
    lastCheck: isoMinutesAgo(4),
  },
  {
    name: 'Services',
    status: 'degraded',
    responsibility: 'Archive jobs, diagnostics, remote maintenance logs',
    lastCheck: isoMinutesAgo(18),
  },
];

export const cmsRegisters: CmsRegister[] = [
  {
    id: 'REG-01',
    label: 'Front Counter',
    status: 'online',
    lastHeartbeat: isoMinutesAgo(2),
    openShift: 'A9',
    tillId: 'TILL-A9-01',
    terminalBatch: 'TB-7124',
    drawerExpected: 643.25,
  },
  {
    id: 'REG-02',
    label: 'Fuel Desk',
    status: 'degraded',
    lastHeartbeat: isoMinutesAgo(18),
    openShift: 'A9',
    tillId: 'TILL-A9-02',
    terminalBatch: 'TB-7124',
    drawerExpected: 418.1,
  },
  {
    id: 'KDS-01',
    label: 'Grill KDS',
    status: 'online',
    lastHeartbeat: isoMinutesAgo(1),
    openShift: 'Lunch Grill',
    tillId: 'KDS-LUNCH-01',
    terminalBatch: 'N/A',
    drawerExpected: 0,
  },
];

export const cmsDepartments: CmsDepartment[] = [
  { name: 'Grill', netSales: 1284.42, transactionCount: 64, marginHint: 'high' },
  { name: 'Fuel Prepay', netSales: 4210.8, transactionCount: 78, marginHint: 'low' },
  { name: 'Coffee', netSales: 312.65, transactionCount: 91, marginHint: 'high' },
  { name: 'Tobacco', netSales: 1648.15, transactionCount: 52, marginHint: 'medium' },
  { name: 'Lotto', netSales: 920, transactionCount: 44, marginHint: 'unknown' },
  { name: 'Deli', netSales: 487.9, transactionCount: 31, marginHint: 'medium' },
];

export const cmsTransactions: CmsTransaction[] = [
  {
    id: 'TX-20260529-1042',
    journalSequence: 'JRN-009884',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'TB-7124',
    registerId: 'REG-01',
    tillId: 'TILL-A9-01',
    cashier: 'A9',
    completedAt: isoMinutesAgo(4),
    department: 'Grill',
    plu: 'PLU-4012',
    subtotal: 18.98,
    tax: 1.57,
    total: 20.55,
    tender: 'Credit',
    paymentNetwork: 'Viper',
    itemCount: 3,
    flags: [],
  },
  {
    id: 'TX-20260529-1041',
    journalSequence: 'JRN-009883',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'TB-7124',
    registerId: 'REG-02',
    tillId: 'TILL-A9-02',
    cashier: 'A9',
    completedAt: isoMinutesAgo(8),
    department: 'Fuel Prepay',
    plu: 'FUEL-87',
    subtotal: 45,
    tax: 0,
    total: 45,
    tender: 'Debit',
    paymentNetwork: 'Viper',
    itemCount: 1,
    flags: ['fuel-prepay'],
  },
  {
    id: 'TX-20260529-1040',
    journalSequence: 'JRN-009882',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'TB-7124',
    registerId: 'REG-01',
    tillId: 'TILL-A9-01',
    cashier: 'A9',
    completedAt: isoMinutesAgo(12),
    department: 'Tobacco',
    plu: 'PLU-7720',
    subtotal: 23.5,
    tax: 1.94,
    total: 25.44,
    tender: 'Cash',
    paymentNetwork: 'Cash Drawer',
    itemCount: 2,
    flags: ['age-restricted'],
  },
  {
    id: 'TX-20260529-1039',
    journalSequence: 'JRN-009881',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'TB-7124',
    registerId: 'REG-01',
    tillId: 'TILL-A9-01',
    cashier: 'A9',
    completedAt: isoMinutesAgo(17),
    department: 'Coffee',
    plu: 'PLU-1200',
    subtotal: 3.49,
    tax: 0.29,
    total: 3.78,
    tender: 'Cash',
    paymentNetwork: 'Cash Drawer',
    itemCount: 1,
    flags: [],
  },
  {
    id: 'TX-20260529-1038',
    journalSequence: 'JRN-009880',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'LOTTO-2291',
    registerId: 'REG-02',
    tillId: 'TILL-A9-02',
    cashier: 'A9',
    completedAt: isoMinutesAgo(23),
    department: 'Lotto',
    plu: 'LOTTO-SCRATCH',
    subtotal: 20,
    tax: 0,
    total: 20,
    tender: 'Lotto',
    paymentNetwork: 'Lottery Terminal',
    itemCount: 4,
    flags: [],
  },
  {
    id: 'TX-20260529-1037',
    journalSequence: 'JRN-009879',
    transactionSetId: 'TRANSSET-20260529-A',
    terminalBatch: 'TB-7124',
    registerId: 'REG-01',
    tillId: 'TILL-A9-01',
    cashier: 'A9',
    completedAt: isoMinutesAgo(34),
    department: 'Deli',
    plu: 'PLU-3328',
    subtotal: 11.25,
    tax: 0.93,
    total: 12.18,
    tender: 'Credit',
    paymentNetwork: 'Viper',
    itemCount: 2,
    flags: ['refund'],
  },
];

export const cmsTenderSummary: CmsTenderSummary[] = [
  { tender: 'Credit', count: 24, amount: 1688.42, settlementState: 'open' },
  { tender: 'Debit', count: 31, amount: 2194.75, settlementState: 'open' },
  { tender: 'Cash', count: 58, amount: 1053.2, settlementState: 'review' },
  { tender: 'Lotto', count: 44, amount: 920, settlementState: 'balanced' },
  { tender: 'Fleet', count: 9, amount: 756.92, settlementState: 'open' },
];

export const cmsFuelPositions: CmsFuelPosition[] = [
  { id: 'FP-01', dispenser: 'Gilbarco CRIND 1', status: 'online', currentMode: 'idle', lastSaleGallons: 12.42, lastSaleAmount: 45 },
  { id: 'FP-02', dispenser: 'Gilbarco CRIND 2', status: 'online', currentMode: 'fueling', lastSaleGallons: 8.11, lastSaleAmount: 29.84 },
  { id: 'FP-03', dispenser: 'Wayne CAT 3', status: 'degraded', currentMode: 'authorized', lastSaleGallons: 0, lastSaleAmount: 0 },
  { id: 'FP-04', dispenser: 'Wayne CAT 4', status: 'online', currentMode: 'idle', lastSaleGallons: 15.03, lastSaleAmount: 54.88 },
];

export const cmsJournalEvents: CmsJournalEvent[] = [
  {
    sequence: 'JRN-009885',
    source: 'Services',
    level: 'warning',
    occurredAt: isoMinutesAgo(5),
    message: 'Transaction Manager archive-new run completed with one delayed register heartbeat.',
  },
  {
    sequence: 'JRN-009884',
    source: 'EPS',
    level: 'info',
    occurredAt: isoMinutesAgo(4),
    message: 'Viper terminal batch TB-7124 accepted credit sale TX-20260529-1042.',
  },
  {
    sequence: 'JRN-009883',
    source: 'Forecourt',
    level: 'info',
    occurredAt: isoMinutesAgo(8),
    message: 'Fuel prepay authorized on FP-01 without additional merchandise fuel lines.',
  },
  {
    sequence: 'JRN-009878',
    source: 'Register',
    level: 'info',
    occurredAt: isoMinutesAgo(38),
    message: 'Cashier A9 till opened on REG-01 and REG-02.',
  },
];

export const cmsSyncRuns: CmsSyncRun[] = [
  {
    id: 'SYNC-20260529-1640',
    source: 'Transaction-set t-log archive',
    tool: 'PDK Export',
    command: 'vtranssetz',
    schema: 'transset.xsd',
    status: 'online',
    startedAt: isoMinutesAgo(7),
    completedAt: isoMinutesAgo(5),
    recordsPulled: 156,
    recordsAccepted: 156,
    warningCount: 0,
  },
  {
    id: 'SYNC-20260529-1635',
    source: 'Department sales rollup',
    tool: 'Report Navigator',
    status: 'online',
    startedAt: isoMinutesAgo(12),
    completedAt: isoMinutesAgo(10),
    recordsPulled: 18,
    recordsAccepted: 18,
    warningCount: 0,
  },
  {
    id: 'SYNC-20260529-1625',
    source: 'Register heartbeat',
    tool: 'Journal Browser',
    status: 'degraded',
    startedAt: isoMinutesAgo(22),
    completedAt: isoMinutesAgo(20),
    recordsPulled: 3,
    recordsAccepted: 2,
    warningCount: 1,
  },
];

export const getCmsSummary = () => {
  const grossSales = cmsTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const departmentSales = cmsDepartments.reduce((sum, department) => sum + department.netSales, 0);
  const flaggedTransactions = cmsTransactions.filter((tx) => tx.flags.length > 0).length;
  const openWarnings =
    cmsRegisters.filter((register) => register.status !== 'online').length +
    cmsCores.filter((core) => core.status !== 'online').length +
    cmsJournalEvents.filter((event) => event.level !== 'info').length;

  return {
    config: cmsConfig,
    metrics: {
      grossSales,
      departmentSales,
      transactionCount: cmsTransactions.length,
      averageTicket: grossSales / cmsTransactions.length,
      flaggedTransactions,
      openWarnings,
    },
    cores: cmsCores,
    registers: cmsRegisters,
    departments: cmsDepartments,
    tenderSummary: cmsTenderSummary,
    fuelPositions: cmsFuelPositions,
    journalEvents: cmsJournalEvents,
    recentTransactions: cmsTransactions,
    syncRuns: cmsSyncRuns,
  };
};
