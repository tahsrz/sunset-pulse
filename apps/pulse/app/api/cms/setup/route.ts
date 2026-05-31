export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { readUsbBridgeState, writeUsbBridgeState } from '@/lib/cms/usbBridge';

const detectFormat = (fileName: string, content: string) => {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.trim();

  if (lowerName.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (lowerName.endsWith('.xml') || trimmed.startsWith('<')) return 'xml';
  if (lowerName.endsWith('.csv') || trimmed.includes(',')) return 'csv';
  if (trimmed.length > 0) return 'text';
  return 'unknown';
};

const countPreviewRows = (content: string) => content.split(/\r?\n/).filter(Boolean).slice(0, 25).length;

export const GET = async () => {
  try {
    const state = await readUsbBridgeState();
    return successResponse(state.setup, {
      source: 'rubyci-setup',
    });
  } catch (error: any) {
    return errorResponse('Failed to load RubyCi setup state.', 500, error.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const current = await readUsbBridgeState();
    const nextSetup = {
      ...current.setup,
      rubyCiIp: body.rubyCiIp ?? current.setup.rubyCiIp,
      backOfficeExportPath: body.backOfficeExportPath ?? current.setup.backOfficeExportPath,
      usbWatchPath: body.usbWatchPath ?? current.setup.usbWatchPath,
      cSiteLoginStatus: body.cSiteLoginStatus ?? current.setup.cSiteLoginStatus,
      checklist: {
        ...current.setup.checklist,
        ...(body.checklist || {}),
      },
    };

    const state = await writeUsbBridgeState({
      setup: nextSetup,
      warning: 'RubyCi installer setup updated.',
    });

    return successResponse(state.setup, {
      source: 'rubyci-setup',
    });
  } catch (error: any) {
    return errorResponse('Failed to save RubyCi setup state.', 500, error.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return errorResponse('Sample export file is required.', 400);
    }

    const content = await file.text();
    const state = await writeUsbBridgeState({
      status: 'ingesting',
      mode: 'file-drop',
      deviceLabel: 'RubyCi sample export importer',
      acceptedRecords: countPreviewRows(content),
      lastBatchId: `SAMPLE-${Date.now()}`,
      warning: 'Sample file imported for parser discovery.',
      setup: {
        sampleImport: {
          fileName: file.name,
          size: file.size,
          detectedFormat: detectFormat(file.name, content),
          previewRows: countPreviewRows(content),
          importedAt: new Date().toISOString(),
        },
      },
    });

    return successResponse(
      {
        setup: state.setup,
        bridge: state,
      },
      {
        source: 'rubyci-setup-importer',
      }
    );
  } catch (error: any) {
    return errorResponse('Failed to import RubyCi sample export.', 500, error.message);
  }
};
