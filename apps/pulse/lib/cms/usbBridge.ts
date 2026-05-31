import fs from 'fs/promises';
import path from 'path';

export type CmsUsbBridgeState = {
  status: 'ready' | 'attached' | 'ingesting' | 'error';
  mode: 'mock' | 'usb-serial' | 'file-drop';
  deviceLabel: string;
  portName: string;
  vendorId?: string;
  productId?: string;
  lastHeartbeat: string;
  lastBatchId?: string;
  acceptedRecords: number;
  warning?: string;
  setup: CmsRubyCiSetupState;
};

export type CmsRubyCiSetupState = {
  rubyCiIp: string;
  backOfficeExportPath: string;
  usbWatchPath: string;
  cSiteLoginStatus: 'unknown' | 'available' | 'not-available' | 'pending';
  checklist: {
    reportNavigator: boolean;
    transactionManager: boolean;
    journalBrowser: boolean;
    smsImportExport: boolean;
    cSiteManagement: boolean;
  };
  sampleImport?: {
    fileName: string;
    size: number;
    detectedFormat: 'json' | 'csv' | 'xml' | 'text' | 'unknown';
    previewRows: number;
    importedAt: string;
  };
};

type CmsRubyCiSetupPatch = Partial<Omit<CmsRubyCiSetupState, 'checklist'>> & {
  checklist?: Partial<CmsRubyCiSetupState['checklist']>;
};

type CmsUsbBridgeStatePatch = Partial<Omit<CmsUsbBridgeState, 'setup'>> & {
  setup?: CmsRubyCiSetupPatch;
};

const statePath = () => path.resolve(process.cwd(), '.cms-bridge-state.json');

export const defaultRubyCiSetupState = (): CmsRubyCiSetupState => ({
  rubyCiIp: '192.168.1.104',
  backOfficeExportPath: 'C:\\RubyCi\\Exports',
  usbWatchPath: 'E:\\RubyCiExports',
  cSiteLoginStatus: 'unknown',
  checklist: {
    reportNavigator: false,
    transactionManager: false,
    journalBrowser: false,
    smsImportExport: false,
    cSiteManagement: false,
  },
});

export const defaultUsbBridgeState = (): CmsUsbBridgeState => ({
  status: 'ready',
  mode: 'mock',
  deviceLabel: 'Waiting for RubyCi USB export bridge',
  portName: 'AUTO',
  vendorId: '11CA',
  productId: '0220',
  lastHeartbeat: new Date().toISOString(),
  acceptedRecords: 0,
  warning: 'No live USB bridge has checked in yet. Mock mode is safe for UI testing.',
  setup: defaultRubyCiSetupState(),
});

export const readUsbBridgeState = async (): Promise<CmsUsbBridgeState> => {
  try {
    const raw = await fs.readFile(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    const defaultSetup = defaultRubyCiSetupState();
    return {
      ...defaultUsbBridgeState(),
      ...parsed,
      setup: {
        ...defaultSetup,
        ...(parsed.setup || {}),
        checklist: {
          ...defaultSetup.checklist,
          ...(parsed.setup?.checklist || {}),
        },
      },
    };
  } catch {
    return defaultUsbBridgeState();
  }
};

export const writeUsbBridgeState = async (state: CmsUsbBridgeStatePatch) => {
  const currentState = await readUsbBridgeState();
  const nextState: CmsUsbBridgeState = {
    ...currentState,
    ...state,
    setup: {
      ...currentState.setup,
      ...(state.setup || {}),
      checklist: {
        ...currentState.setup.checklist,
        ...(state.setup?.checklist || {}),
      },
    },
    lastHeartbeat: state.lastHeartbeat || new Date().toISOString(),
  };

  await fs.writeFile(statePath(), `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  return nextState;
};

export const assertBridgeToken = (token: string | null) => {
  const expectedToken = process.env.CMS_BRIDGE_TOKEN;
  return !expectedToken || token === expectedToken;
};
