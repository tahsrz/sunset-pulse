import type { SellerDailyData } from './sellerDailyContract';
import { sellerPrioritiesSchema } from './sellerOverviewContract';
import type { z } from 'zod';
export type SellerPriority={id:string;title:string;reason:string;href:string;score:number;dueAt:string|null};
export function rankSellerPriorities(daily:SellerDailyData,extra:z.infer<typeof sellerPrioritiesSchema>['items']=[],now=Date.now()):SellerPriority[]{
  const rows:SellerPriority[]=[
    ...daily.overdueActions.map((row)=>({id:`overdue:${row.occurrence_id}`,title:row.name,reason:`Overdue since ${row.effective_date}: ${row.title_snapshot}`,href:`/planner?date=${encodeURIComponent(row.effective_date)}`,score:100,dueAt:row.effective_date})),
    ...daily.unscheduledRequests.map((row)=>({id:`request:${row.id}`,title:row.name,reason:'Requested contact; no initial response has been recorded or scheduled.',href:`/seller-inbox?leadId=${row.id}`,score:90,dueAt:row.created_at})),
    ...daily.consultations.filter((row)=>Date.parse(row.occurred_at)>=now-300_000 && Date.parse(row.occurred_at)<=now+86400_000).map((row)=>({id:`consultation:${row.event_id}`,title:row.name,reason:'Confirmed consultation within 24 hours; review preparation and record attendance afterward.',href:`/seller-cases/${row.lead_id}`,score:85,dueAt:row.occurred_at})),
    ...extra.map((row)=>({...row,href:`/seller-cases/${row.leadId}`})),
  ];
  return rows.sort((a,b)=>b.score-a.score || (a.dueAt || '').localeCompare(b.dueAt || '') || a.id.localeCompare(b.id));
}
