import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the env containing production database URL
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Temporarily override local DATABASE_URL with the production transaction pooler for the Prisma Client
const prodPoolerUrl = "postgresql://postgres.xlyfhiafactxahhvikyv:SunsetPulseCollective@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
process.env.DATABASE_URL = prodPoolerUrl;

async function main() {
  // Dynamically import prisma to ensure the DATABASE_URL override is in effect before module evaluation
  const { prisma } = await import('@calcom/prisma');
  console.log('🔌 Testing Prisma query against remote PRODUCTION database...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    const startDateParam = '2026-05-18T05:00:00.000Z';
    const endDateParam = '2026-05-25T04:59:59.999Z';

    const bookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: new Date(startDateParam),
          lte: new Date(endDateParam),
        },
        eventType: {
          slug: {
            in: ['grill-shift', 'register-shift'],
          },
        },
      },
      include: {
        eventType: true,
        user: {
          include: {
            verifiedNumbers: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    console.log(`✅ Success! Fetched ${bookings.length} bookings from production via Prisma.`);
    if (bookings.length > 0) {
      console.log('First booking sample:', {
        id: bookings[0].id,
        title: bookings[0].title,
        startTime: bookings[0].startTime,
        user: bookings[0].user?.name,
      });
    }
  } catch (error: any) {
    console.error('❌ Prisma Query Failed with Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
