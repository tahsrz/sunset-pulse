import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const { prisma } = await import('../lib/core/prisma');
  try {
    console.log('🔌 [DEPLOY] Starting safe Calendso schema deployment...');
    const sqlPath = path.resolve(__dirname, 'calendso-schema.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL schema file not found at: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    const rawStatements = sqlContent.split(';');
    
    const statements = rawStatements
      .map(stmt => {
        // Remove SQL comment lines (starting with --)
        const cleaned = stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        return cleaned;
      })
      .filter(stmt => stmt.length > 0);

    console.log(`🔍 [DEPLOY] Parsed ${statements.length} SQL statements to execute.`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      
      // Clean up whitespace and comments for logs/execution
      stmt = stmt.replace(/\r\n/g, '\n').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      // Skip empty or schema-only creations (public schema already exists)
      if (stmt.toLowerCase().startsWith('create schema')) {
        continue;
      }

      try {
        await prisma.$executeRawUnsafe(stmt);
        successCount++;
      } catch (err: any) {
        const errMsg = err.message || '';
        // If it already exists, we skip cleanly
        if (
          errMsg.includes('already exists') || 
          errMsg.includes('42P07') || // duplicate_table
          errMsg.includes('42710')    // duplicate_object
        ) {
          skippedCount++;
        } else {
          errorCount++;
          console.error(`❌ [DEPLOY] Error executing statement ${i + 1}:`);
          console.error(`Statement: ${stmt.substring(0, 150)}...`);
          console.error(`Error: ${errMsg}`);
        }
      }
    }

    console.log(`\n📊 [DEPLOY] Deployment Summary:`);
    console.log(`  - Total statements: ${statements.length}`);
    console.log(`  - Executed successfully: ${successCount}`);
    console.log(`  - Skipped (already exist): ${skippedCount}`);
    console.log(`  - Failed with other errors: ${errorCount}`);

    if (errorCount > 0) {
      console.warn(`⚠️ [DEPLOY] Schema deployment finished with ${errorCount} errors. Please review them above.`);
    } else {
      console.log(`🎉 [DEPLOY] Calendso schema deployment completed safely without data loss!`);
    }

  } catch (error: any) {
    console.error('❌ [DEPLOY] Critical error during deploy script execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
