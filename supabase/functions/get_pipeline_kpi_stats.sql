-- RPC: get_pipeline_kpi_stats
-- Returns pipeline KPI data for the dashboard:
--   - per-stage lead counts
--   - stage-to-stage conversion rates
--   - bottleneck flags (high volume + low forward conversion)
-- Managers/admins see all leads; advisors see only their visible leads.

DROP FUNCTION IF EXISTS public.get_pipeline_kpi_stats();

CREATE OR REPLACE FUNCTION public.get_pipeline_kpi_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id   BIGINT;
  v_viewer_role TEXT;
  v_result      JSONB;
BEGIN
  SELECT u.id, u.role INTO v_viewer_id, v_viewer_role
    FROM public.users u
   WHERE u.user_id = auth.uid()
   LIMIT 1;

  WITH visible_leads AS (
    SELECT l.id, l.pipeline_stage
      FROM public.leads l
     WHERE
       (v_viewer_role IN ('manager', 'admin'))
       OR EXISTS (
            SELECT 1 FROM public.users_leads ul
             WHERE ul.lead_id = l.id AND ul.user_id = v_viewer_id
          )
       OR EXISTS (
            SELECT 1 FROM public.lead_shares ls
             WHERE ls.lead_id = l.id AND ls.user_id = v_viewer_id
          )
  ),
  stage_counts AS (
    SELECT
      gs.stage,
      COALESCE(COUNT(vl.id), 0)::BIGINT AS lead_count
    FROM generate_series(0, 8) AS gs(stage)
    LEFT JOIN visible_leads vl ON vl.pipeline_stage = gs.stage
    GROUP BY gs.stage
    ORDER BY gs.stage
  ),
  total AS (
    SELECT SUM(lead_count) AS total_leads FROM stage_counts
  ),
  with_conversion AS (
    SELECT
      sc.stage,
      sc.lead_count,
      -- Forward conversion: % of leads at this stage that exist at the next stage
      -- (simple ratio: next_stage_count / this_stage_count)
      CASE
        WHEN sc.lead_count > 0 AND sc.stage < 8
        THEN ROUND(
               (LEAD(sc.lead_count) OVER (ORDER BY sc.stage) * 100.0) / NULLIF(sc.lead_count, 0),
               1
             )
        ELSE NULL
      END AS conversion_rate_pct,
      total.total_leads
    FROM stage_counts sc
    CROSS JOIN total
  )
  SELECT jsonb_build_object(
    'total_leads', (SELECT total_leads FROM total),
    'stages', jsonb_agg(
      jsonb_build_object(
        'stage',               wc.stage,
        'lead_count',          wc.lead_count,
        'conversion_rate_pct', wc.conversion_rate_pct,
        -- Bottleneck: stage has >= 15% of all leads AND conversion_rate < 30%
        'is_bottleneck',       (
          wc.total_leads > 0
          AND (wc.lead_count * 100.0 / NULLIF(wc.total_leads, 0)) >= 15
          AND (wc.conversion_rate_pct IS NOT NULL AND wc.conversion_rate_pct < 30)
        )
      )
      ORDER BY wc.stage
    )
  ) INTO v_result
  FROM with_conversion wc;

  RETURN v_result;
END;
$$;
