import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const { prisma } = await import('../lib/core/prisma');
  try {
    console.log('🔍 [DIAGNOSTIC] Connecting to production database to audit schemas...');
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
      console.log('🔗 [DIAGNOSTIC] Connection URL:', masked);
    } else {
      console.log('⚠️ [DIAGNOSTIC] process.env.DATABASE_URL is not set!');
    }
    
    // 1. Check if we can run a simple query
    const nowResult = await prisma.$queryRaw`SELECT now()`;

    console.log('✅ [DIAGNOSTIC] Connection established. Server time:', nowResult);

    // 2. Query columns of jamie_interactions
    const jamieCols: any = await prisma.$queryRaw`
      SELECT CAST(column_name AS text) as column_name, CAST(data_type AS text) as data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'jamie_interactions'
    `;
    console.log('✅ [DIAGNOSTIC] jamie_interactions columns:', jamieCols);

    const columns: any = await prisma.$queryRaw`
      SELECT CAST(column_name AS text) as column_name, CAST(data_type AS text) as data_type, CAST(is_nullable AS text) as is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    `;
    
    if (columns.length === 0) {
      console.log('❌ [DIAGNOSTIC] Table "public.profiles" does not exist in the production database!');
    } else {
      console.log('✅ [DIAGNOSTIC] Profiles table found. Columns:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable=${col.is_nullable})`);
      });
    }

    // 3. Check trigger function
    const triggerFunc: any = await prisma.$queryRaw`
      SELECT CAST(routine_name AS text) as routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = 'handle_new_user'
    `;
    console.log('📢 [DIAGNOSTIC] handle_new_user routine found:', triggerFunc.length > 0 ? 'YES' : 'NO');

    if (triggerFunc.length > 0) {
      const funcSource: any = await prisma.$queryRaw`
        SELECT CAST(pg_get_functiondef(p.oid) AS text) as ddl 
        FROM pg_proc p 
        WHERE p.proname = 'handle_new_user'
      `;
      if (funcSource.length > 0) {
        console.log('📜 [DIAGNOSTIC] handle_new_user DDL:');
        console.log(funcSource[0].ddl);
      }
    }

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Error during database audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
