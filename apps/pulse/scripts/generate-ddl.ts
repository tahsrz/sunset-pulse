import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const exec = promisify(execCb);

async function main() {
  try {
    console.log('⚡ Generating Calendso DDL from Prisma schema...');
    const schemaPath = path.resolve(__dirname, '../../../packages/prisma/schema.prisma');
    const prismaCliPath = path.resolve(__dirname, '../../../packages/prisma/node_modules/prisma/build/index.js');
    
    // We run migrate diff from empty to the schema.prisma
    const { stdout, stderr } = await exec(
      `node "${prismaCliPath}" migrate diff --from-empty --to-schema-datamodel="${schemaPath}" --script`,
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for the massive SQL output
      }
    );
    
    const outputPath = path.resolve(__dirname, 'calendso-schema.sql');
    fs.writeFileSync(outputPath, stdout);
    console.log(`✅ Success! Generated SQL written to: ${outputPath} (${stdout.length} bytes)`);
    if (stderr) {
      console.warn('⚠️ Warnings/Errors:', stderr);
    }
  } catch (err: any) {
    console.error('❌ Failed to generate DDL:', err.message);
  }
}

main();
