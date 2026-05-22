import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST() {
  // Only allow local requests to trigger disk writes
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized. Local access only.' }, { status: 403 });
  }

  return new Promise((resolve) => {
    const scriptPath = path.resolve('scripts/archive_intel.mjs');
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Archive Error: ${error}`);
        return resolve(NextResponse.json({ error: 'Archive process failed.' }, { status: 500 }));
      }
      console.log(`Archive Output: ${stdout}`);
      resolve(NextResponse.json({ success: true, output: stdout }));
    });
  });
}
