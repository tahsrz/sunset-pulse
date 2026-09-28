import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getTemplateRow } from '@/lib/contracts/trecTemplateRegistry';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  const formId = decodeFormId((await params).formId);
  const row = getTemplateRow(formId);
  if (!row?.templatePath) return NextResponse.json({ error: 'No PDF preview is available for this form.' }, { status: 404 });

  const templateRoot = path.resolve(process.cwd(), 'private', 'contracts', 'trec');
  const filePath = path.resolve(process.cwd(), row.templatePath);
  if (!filePath.startsWith(`${templateRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'Invalid template path.' }, { status: 404 });
  }

  try {
    const bytes = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'The official PDF preview is not uploaded.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to load the PDF preview.' }, { status: 500 });
  }
}

function decodeFormId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
