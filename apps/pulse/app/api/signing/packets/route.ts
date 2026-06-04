export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { getSessionUser } from '@/lib/core/getSessionUser';
import SigningPacket from '@/models/SigningPacket';
import { createSignerToken, hashPayload } from '@/lib/signing/signingHash';

export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return NextResponse.json({ error: 'Authentication required to create signing packets.' }, { status: 401 });
    }

    const body = await request.json();
    const draftPayload = body?.draftPayload;
    if (!draftPayload?.fieldMap || !draftPayload?.forms) {
      return NextResponse.json({ error: 'A normalized draftPayload is required.' }, { status: 400 });
    }

    await connectDB();

    const payloadHash = hashPayload(draftPayload);
    const signerLinks = (draftPayload.signerRoles || [])
      .filter((signer: any) => signer?.name)
      .map((signer: any) => ({
        role: signer.role,
        name: signer.name,
        email: signer.email,
        routingOrder: signer.routingOrder || 1,
        token: createSignerToken(),
        status: 'pending',
      }));

    const packet = await SigningPacket.create({
      title: body.title || `Offer packet: ${draftPayload.transaction?.propertyAddress || 'property'}`,
      status: signerLinks.length > 0 ? 'sent' : 'draft',
      createdBy: sessionUser.userId,
      draftPayload,
      payloadHash,
      signerLinks,
      auditTrail: [
        {
          type: 'packet_created',
          actorName: draftPayload.parties?.realtorName || 'Realtor',
          actorRole: 'realtor',
          actorEmail: sessionUser.email,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get('user-agent') || '',
          payloadHash,
          metadata: {
            signerCount: signerLinks.length,
            formCount: 1 + (draftPayload.forms?.addenda?.length || 0) + (draftPayload.forms?.otherForms?.length || 0),
          },
        },
      ],
    });

    return NextResponse.json({
      data: {
        packetId: packet._id,
        status: packet.status,
        payloadHash,
        signerLinks: packet.signerLinks.map((signer: any) => ({
          role: signer.role,
          name: signer.name,
          email: signer.email,
          status: signer.status,
          url: `/sign/${signer.token}`,
        })),
      },
    });
  } catch (error: any) {
    console.error('[SIGNING_PACKET_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create signing packet.', detail: error.message }, { status: 500 });
  }
};

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
}
