-- One exact source identity has at most one planner item. Return its saved date
-- and status only to its current seller-site and personal-workspace owner.
CREATE FUNCTION public.seller_lead_read_planner_link(
  p_actor_id UUID, p_workspace_id UUID, p_lead_id UUID, p_action_key TEXT
) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT jsonb_build_object(
    'itemId', item.id, 'title', item.title, 'itemStatus', item.status,
    'effectiveDate', occurrence.effective_date, 'occurrenceStatus', occurrence.status
  )
  FROM public.realtor_planner_items item
  JOIN public.agent_site_leads lead ON lead.id=item.source_lead_id AND lead.source='seller_plan'
  JOIN public.site_config site ON site.agent_id=lead.agent_id AND site.owner_id=p_actor_id AND site.status='active'
  JOIN public.platform_workspaces workspace ON workspace.id=item.workspace_id
    AND workspace.kind='personal' AND workspace.created_by=p_actor_id AND workspace.status='active'
  JOIN public.platform_memberships membership ON membership.workspace_id=workspace.id
    AND membership.user_id=p_actor_id AND membership.role='owner' AND membership.status='active'
  LEFT JOIN LATERAL (
    SELECT saved.effective_date, saved.status
    FROM public.realtor_planner_occurrences saved
    WHERE saved.item_id=item.id AND saved.workspace_id=p_workspace_id AND saved.user_id=p_actor_id
    ORDER BY saved.original_date, saved.id LIMIT 1
  ) occurrence ON true
  WHERE item.user_id=p_actor_id AND item.workspace_id=p_workspace_id
    AND item.source_lead_id=p_lead_id AND item.source_lead_action_key=p_action_key
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.seller_lead_read_planner_link(UUID,UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_lead_read_planner_link(UUID,UUID,UUID,TEXT) TO service_role;
