export const dynamic = 'force-dynamic';

import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import {
  getSunsetChatExpiresAt,
  validateSunsetChatInput,
} from '@/lib/grill/sunsetChat';
import { DEALS } from '@/lib/grill/deals';
import SunsetChatPost from '@/models/SunsetChatPost';

const recentPostsByDevice = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_POSTS = 4;

export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const posts = await SunsetChatPost.find({
      $or: [
        { isPinned: true },
        { expiresAt: { $gt: now } },
      ],
    })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(40)
      .lean();

    return successResponse({ posts: [...getOfficialDealPosts(now), ...posts] });
  } catch (error: any) {
    console.error('[SUNSET_CHAT_GET_FAILURE]:', error);
    return errorResponse('Failed to load Sunset Chat.', 500, error.message);
  }
}

function getOfficialDealPosts(now = new Date()) {
  if (DEALS.length === 0) return [];
  const rotatingDeal = DEALS[Math.floor(now.getTime() / (60 * 60 * 1000)) % DEALS.length];
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  return [{
    _id: `official-deal-${rotatingDeal.code}`,
    nickname: 'Sunset Grill',
    message: `${rotatingDeal.description} Use code ${rotatingDeal.code} at checkout.`,
    tag: 'Deal',
    isPinned: true,
    source: 'official-deal',
    couponCode: rotatingDeal.code,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateSunsetChatInput(body || {});
    if (!validation.ok) {
      return errorResponse(validation.message, 400);
    }

    const deviceKey = getDeviceKey(request);
    if (!isAllowedByRateLimit(deviceKey)) {
      return errorResponse('Too many posts. Give it a minute and try again.', 429);
    }

    await connectDB();
    const post = await SunsetChatPost.create({
      ...validation.value,
      expiresAt: getSunsetChatExpiresAt(),
      deviceKey,
      ipHash: hashValue(getClientIp(request)),
    });

    return successResponse({ post }, {}, 201);
  } catch (error: any) {
    console.error('[SUNSET_CHAT_POST_FAILURE]:', error);
    return errorResponse('Failed to post to Sunset Chat.', 500, error.message);
  }
}

function getDeviceKey(request: NextRequest) {
  const supplied = request.headers.get('x-sunset-chat-device-id');
  if (supplied && supplied.length <= 80) return supplied;
  return hashValue(`${getClientIp(request)}:${request.headers.get('user-agent') || 'unknown'}`);
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function isAllowedByRateLimit(deviceKey: string) {
  const now = Date.now();
  const recent = (recentPostsByDevice.get(deviceKey) || [])
    .filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_POSTS) {
    recentPostsByDevice.set(deviceKey, recent);
    return false;
  }

  recent.push(now);
  recentPostsByDevice.set(deviceKey, recent);
  return true;
}
