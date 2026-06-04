export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import SigningPacket from '@/models/SigningPacket';
import { generateSigningCertificatePdf } from '@/lib/signing/signingCertificatePdf';

export const GET = async (_request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  try {
    const { token } = await params;
    await connectDB();

    const packet = await SigningPacket.findOne({ 'signerLinks.token': token }).lean();
    if (!packet) {
      return NextResponse.json({ error: 'Signing packet not found.' }, { status: 404 });
    }

    const pdfBytes = await generateSigningCertificatePdf(packet as any);
    const filename = `${slugify(packet.title || 'signing-packet')}-final-package.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[SIGNING_FINAL_PDF_ERROR]', error);
    return NextResponse.json({ error: 'Failed to generate signing PDF.', detail: error.message }, { status: 500 });
  }
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'signing-packet';
}
