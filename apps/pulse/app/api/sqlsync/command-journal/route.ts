import { NextResponse } from 'next/server';
import { getSqlsyncCommandJournalSnapshot } from '@/lib/sqlsync/commandJournal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    data: {
      framework: 'sqlsync',
      purpose: 'Local-first mutation journal for Command Center memory and action state.',
      reducerContract: [
        'upsert_command_query_memory',
        'upsert_command_action_memory'
      ],
      snapshot: getSqlsyncCommandJournalSnapshot()
    }
  });
}
