import { NextResponse } from 'next/server';
import { getAnimalOfDay } from '@/lib/animals/animalOfDay';

export const revalidate = 86400;

export async function GET() {
  const animal = getAnimalOfDay();

  if (!animal) {
    return NextResponse.json(
      {
        animal: null,
        error: 'Animal cartridge unavailable.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    animal,
    timestamp: new Date().toISOString(),
  });
}
