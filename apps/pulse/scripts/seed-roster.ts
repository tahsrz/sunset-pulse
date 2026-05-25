import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Resolve environment variables from the apps/.env and apps/pulse/.env.local files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../apps/.env') });

let prisma: any;

const employees = [
  { name: 'Sierra', username: 'sierra', email: 'sierra@sunsetgrill.com', phone: '+15551110001' },
  { name: 'Beth', username: 'beth', email: 'beth@sunsetgrill.com', phone: '+15551110002' },
  { name: 'Taz', username: 'taz', email: 'taz@sunsetgrill.com', phone: '+15551110003' },
  { name: 'Angela', username: 'angela', email: 'angela@sunsetgrill.com', phone: '+15551110004' },
  { name: 'Stephanie', username: 'stephanie', email: 'stephanie@sunsetgrill.com', phone: '+15551110005' },
  { name: 'Sherrie', username: 'sherrie', email: 'sherrie@sunsetgrill.com', phone: '+15551110006' },
  { name: 'Shaikh', username: 'shaikh', email: 'shaikh@sunsetgrill.com', phone: '+15551110007' },
  { name: 'Sharon', username: 'sharon', email: 'sharon@sunsetgrill.com', phone: '+15551110008' },
  { name: 'Tamara', username: 'tamara', email: 'tamara@sunsetgrill.com', phone: '+15551110009' },
];

async function seed() {
  try {
    const prismaModule = await import('@calcom/prisma');
    prisma = prismaModule.prisma;

    console.log('🌱 [ROSTER_SEED] Connecting to database and running seed protocol...');

    // 1. Ensure Event Types exist
    console.log('🌱 [ROSTER_SEED] Verifying event types...');
    const grillEventType = await prisma.eventType.upsert({
      where: { id: 8801 }, // Using a fixed ID to avoid conflicts and allow repeatable runs
      update: {
        title: 'Grill Shift',
        slug: 'grill-shift',
        length: 480, // 8 hours
      },
      create: {
        id: 8801,
        title: 'Grill Shift',
        slug: 'grill-shift',
        length: 480,
      },
    });

    const registerEventType = await prisma.eventType.upsert({
      where: { id: 8802 },
      update: {
        title: 'Register Shift',
        slug: 'register-shift',
        length: 480,
      },
      create: {
        id: 8802,
        title: 'Register Shift',
        slug: 'register-shift',
        length: 480,
      },
    });

    console.log(`✅ [ROSTER_SEED] Event Types Verified:`);
    console.log(`  - Grill Shift ID: ${grillEventType.id}`);
    console.log(`  - Register Shift ID: ${registerEventType.id}`);

    // 2. Ensure Users (Employees) exist
    const seededUsers = [];
    for (const emp of employees) {
      console.log(`🌱 [ROSTER_SEED] Upserting employee: ${emp.name}`);
      const user = await prisma.user.upsert({
        where: { email: emp.email },
        update: {
          name: emp.name,
          username: emp.username,
          timeZone: 'America/Chicago',
        },
        create: {
          email: emp.email,
          name: emp.name,
          username: emp.username,
          timeZone: 'America/Chicago',
        },
      });

      // Sync verified phone number
      await prisma.verifiedNumber.deleteMany({
        where: { userId: user.id },
      });
      await prisma.verifiedNumber.create({
        data: {
          userId: user.id,
          phoneNumber: emp.phone,
        },
      });

      seededUsers.push({ ...emp, dbId: user.id });
    }
    console.log('✅ [ROSTER_SEED] Employees synchronized in database.');

    // 3. Calculate current week's Monday
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + daysToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    console.log(`🌱 [ROSTER_SEED] Target Week Range: ${currentMonday.toDateString()} - ${currentSunday.toDateString()}`);

    // Clear out old bookings for this week's range to allow clean re-seeding
    console.log(`🌱 [ROSTER_SEED] Cleaning up existing bookings for target week...`);
    await prisma.booking.deleteMany({
      where: {
        startTime: {
          gte: currentMonday,
          lte: currentSunday,
        },
        eventType: {
          slug: {
            in: ['grill-shift', 'register-shift'],
          },
        },
      },
    });

    // 4. Construct Roster Data for current Monday - Sunday (Full Coverage: 5 AM - 10 PM)
    const rosterData = [
      // Monday (Offset 0) - Sierra & Beth (Opening), Taz & Angela (Closing)
      { dayOffset: 0, role: 'grill', employee: 'Sierra', hours: [5, 13] },
      { dayOffset: 0, role: 'register', employee: 'Beth', hours: [5, 13] },
      { dayOffset: 0, role: 'grill', employee: 'Taz', hours: [13, 22] },
      { dayOffset: 0, role: 'register', employee: 'Angela', hours: [13, 22] },

      // Tuesday (Offset 1) - Taz & Angela (Opening), Sierra & Beth (Closing)
      { dayOffset: 1, role: 'grill', employee: 'Taz', hours: [5, 13] },
      { dayOffset: 1, role: 'register', employee: 'Angela', hours: [5, 13] },
      { dayOffset: 1, role: 'grill', employee: 'Sierra', hours: [13, 22] },
      { dayOffset: 1, role: 'register', employee: 'Beth', hours: [13, 22] },

      // Wednesday (Offset 2) - Sierra & Beth (Opening), Taz & Angela (Closing)
      { dayOffset: 2, role: 'grill', employee: 'Sierra', hours: [5, 13] },
      { dayOffset: 2, role: 'register', employee: 'Beth', hours: [5, 13] },
      { dayOffset: 2, role: 'grill', employee: 'Taz', hours: [13, 22] },
      { dayOffset: 2, role: 'register', employee: 'Angela', hours: [13, 22] },

      // Thursday (Offset 3) - Taz & Angela (Opening), Sierra & Beth (Closing)
      { dayOffset: 3, role: 'grill', employee: 'Taz', hours: [5, 13] },
      { dayOffset: 3, role: 'register', employee: 'Angela', hours: [5, 13] },
      { dayOffset: 3, role: 'grill', employee: 'Sierra', hours: [13, 22] },
      { dayOffset: 3, role: 'register', employee: 'Beth', hours: [13, 22] },

      // Friday (Offset 4) - Sierra & Beth (Opening), Taz & Angela (Closing)
      { dayOffset: 4, role: 'grill', employee: 'Sierra', hours: [5, 13] },
      { dayOffset: 4, role: 'register', employee: 'Beth', hours: [5, 13] },
      { dayOffset: 4, role: 'grill', employee: 'Taz', hours: [13, 22] },
      { dayOffset: 4, role: 'register', employee: 'Angela', hours: [13, 22] },

      // Saturday (Offset 5) - Taz & Angela (Opening), Sierra & Beth (Closing)
      { dayOffset: 5, role: 'grill', employee: 'Taz', hours: [5, 13] },
      { dayOffset: 5, role: 'register', employee: 'Angela', hours: [5, 13] },
      { dayOffset: 5, role: 'grill', employee: 'Sierra', hours: [13, 22] },
      { dayOffset: 5, role: 'register', employee: 'Beth', hours: [13, 22] },

      // Sunday (Offset 6) - Sierra & Beth (Opening), Taz & Angela (Closing)
      { dayOffset: 6, role: 'grill', employee: 'Sierra', hours: [6, 13] },
      { dayOffset: 6, role: 'register', employee: 'Beth', hours: [6, 13] },
      { dayOffset: 6, role: 'grill', employee: 'Taz', hours: [13, 21] },     // Closing Shift (1-9) today!
      { dayOffset: 6, role: 'register', employee: 'Angela', hours: [13, 21] },
    ];

    console.log('🌱 [ROSTER_SEED] Generating roster bookings...');
    let bookingCount = 0;

    for (const shift of rosterData) {
      const shiftDate = new Date(currentMonday);
      shiftDate.setDate(currentMonday.getDate() + shift.dayOffset);

      const user = seededUsers.find(u => u.name === shift.employee);
      if (!user) {
        console.warn(`⚠️ [ROSTER_SEED] Employee not found: ${shift.employee}`);
        continue;
      }

      const startTime = new Date(shiftDate);
      startTime.setHours(shift.hours[0], 0, 0, 0);
      const endTime = new Date(shiftDate);
      endTime.setHours(shift.hours[1], 0, 0, 0);

      const eventType = shift.role === 'grill' ? grillEventType : registerEventType;
      const title = `${eventType.title} - ${user.name}`;

      const uid = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();
      console.log(`[SEED_ROSTER_LOOP] Booking ${bookingCount}: employee=${shift.employee}, role=${shift.role}, dayOffset=${shift.dayOffset}, startTime=${startTime.toISOString()}, uid=${uid}, idempotencyKey=${idempotencyKey}`);
      
      await prisma.booking.create({
        data: {
          uid,
          title,
          description: `Seeded ${eventType.title}`,
          startTime,
          endTime,
          status: 'ACCEPTED', // MUST be ACCEPTED so predict copies it!
          userId: user.dbId,
          eventTypeId: eventType.id,
          userPrimaryEmail: user.email,
          idempotencyKey,
        },
      });
      bookingCount++;
    }

    console.log(`✅ [ROSTER_SEED] Success! Seeded ${bookingCount} bookings successfully.`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ [ROSTER_SEED] Critical error during seeding:', error);
    process.exit(1);
  }
}

seed();
