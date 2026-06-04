export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import SigningPacket from '@/models/SigningPacket';
import { hashPayload } from '@/lib/signing/signingHash';

export const GET = async (_request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  try {
    const { token } = await params;
    await connectDB();

    const packet = await SigningPacket.findOne({ 'signerLinks.token': token }).lean();
    if (!packet) {
      return NextResponse.json({ error: 'Signing link not found.' }, { status: 404 });
    }

    const signer = packet.signerLinks.find((item: any) => item.token === token);
    if (!signer) {
      return NextResponse.json({ error: 'Signer not found.' }, { status: 404 });
    }

    if (signer.status === 'pending') {
      await SigningPacket.updateOne(
        { _id: packet._id, 'signerLinks.token': token },
        {
          $set: {
            'signerLinks.$.status': 'viewed',
            'signerLinks.$.viewedAt': new Date(),
          },
          $push: {
            auditTrail: {
              type: 'signer_viewed',
              actorRole: signer.role,
              actorName: signer.name,
              actorEmail: signer.email,
              payloadHash: packet.payloadHash,
              createdAt: new Date(),
            },
          },
        }
      );
    }

    return NextResponse.json({
      data: {
        packetId: packet._id,
        title: packet.title,
        status: packet.status,
        payloadHash: packet.payloadHash,
        draftPayload: packet.draftPayload,
        signer: {
          role: signer.role,
          name: signer.name,
          email: signer.email,
          status: signer.status === 'pending' ? 'viewed' : signer.status,
          signedAt: signer.signedAt,
        },
        auditTrail: packet.auditTrail,
      },
    });
  } catch (error: any) {
    console.error('[SIGNING_PACKET_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to load signing packet.', detail: error.message }, { status: 500 });
  }
};

export const POST = async (request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  try {
    const { token } = await params;
    const body = await request.json();
    const typedName = String(body?.typedName || '').trim();
    const signatureDataUrl = String(body?.signatureDataUrl || '').trim();
    const consentAccepted = Boolean(body?.consentAccepted);

    if (!typedName || !signatureDataUrl || !consentAccepted) {
      return NextResponse.json({ error: 'Typed name, signature, and consent are required.' }, { status: 400 });
    }

    await connectDB();
    const packet = await SigningPacket.findOne({ 'signerLinks.token': token });
    if (!packet) {
      return NextResponse.json({ error: 'Signing link not found.' }, { status: 404 });
    }

    const signer = packet.signerLinks.find((item: any) => item.token === token);
    if (!signer) {
      return NextResponse.json({ error: 'Signer not found.' }, { status: 404 });
    }
    if (signer.status === 'signed') {
      return NextResponse.json({ error: 'This signer has already completed the packet.' }, { status: 409 });
    }

    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.consentText = 'I consent to use an electronic signature for this draft packet.';
    signer.signature = {
      typedName,
      signatureDataUrl,
      signedAtLocal: body?.signedAtLocal || new Date().toISOString(),
    };

    const allSigned = packet.signerLinks.every((item: any) => item.status === 'signed');
    packet.status = allSigned ? 'completed' : 'partially_signed';
    packet.finalHash = allSigned ? hashPayload({ draftPayload: packet.draftPayload, signerLinks: packet.signerLinks }) : packet.finalHash;
    packet.auditTrail.push({
      type: 'signer_signed',
      actorRole: signer.role,
      actorName: signer.name,
      actorEmail: signer.email,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || '',
      payloadHash: packet.payloadHash,
      createdAt: new Date(),
      metadata: {
        typedName,
        finalHash: packet.finalHash,
      },
    });

    await packet.save();

    return NextResponse.json({
      data: {
        status: packet.status,
        signerStatus: signer.status,
        signedAt: signer.signedAt,
        payloadHash: packet.payloadHash,
        finalHash: packet.finalHash,
      },
    });
  } catch (error: any) {
    console.error('[SIGNING_PACKET_SIGN_ERROR]', error);
    return NextResponse.json({ error: 'Failed to apply signature.', detail: error.message }, { status: 500 });
  }
};

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
}
