-- RPC: update_lead_pipeline_stage
-- Validates and updates the pipeline_stage for a lead.
-- Rules enforced:
--   1. No backward movement (new stage must be > current stage)
--   2. Stages 1 and 7 are auto-only (managed by n8n) — cannot be set manually via this function
--      Pass p_force = TRUE to bypass these guards (e.g. called from n8n workflows)

DROP FUNCTION IF EXISTS public.update_lead_pipeline_stage(UUID, SMALLINT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_lead_pipeline_stage(
  p_lead_id              UUID,
  p_new_stage            SMALLINT,
  p_force                BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stage SMALLINT;
  v_updated_at    TIMESTAMPTZ;
BEGIN
  -- Fetch current stage
  SELECT pipeline_stage
    INTO v_current_stage
    FROM public.leads
   WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Guard: no backward movement
  IF p_new_stage <= v_current_stage THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot move to a previous or equal stage',
      'current_stage', v_current_stage
    );
  END IF;

  -- Guard: stages 1 and 7 are auto-only unless forced (n8n)
  IF NOT p_force AND p_new_stage IN (1, 7) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stage ' || p_new_stage || ' is managed automatically and cannot be set manually'
    );
  END IF;

  -- Validate range
  IF p_new_stage < 0 OR p_new_stage > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stage must be between 0 and 8');
  END IF;

  v_updated_at := NOW();

  UPDATE public.leads
     SET pipeline_stage            = p_new_stage,
         pipeline_stage_updated_at = v_updated_at
   WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success',     true,
    'lead_id',     p_lead_id,
    'new_stage',   p_new_stage,
    'updated_at',  v_updated_at
  );
END;
$$;
