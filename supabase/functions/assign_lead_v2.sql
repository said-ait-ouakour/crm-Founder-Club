-- RPC: assign_lead_v2
-- Handles secure lead assignment with race condition check.

CREATE OR REPLACE FUNCTION public.assign_lead_v2(
    p_lead_id UUID,
    p_target_auth_user_id UUID DEFAULT NULL -- If NULL, assigns to self
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_viewer_id BIGINT;
    v_viewer_role TEXT;
    v_target_user_id BIGINT;
BEGIN
    -- 1. Identify viewer and role
    SELECT id, role INTO v_viewer_id, v_viewer_role 
    FROM public.users 
    WHERE user_id = auth.uid() 
    LIMIT 1;

    IF v_viewer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User profile not found';
    END IF;

    -- 2. Determine target user
    IF p_target_auth_user_id IS NOT NULL THEN
        -- Only managers/admins can assign to others
        IF v_viewer_role NOT IN ('manager', 'admin') THEN
            RAISE EXCEPTION 'Forbidden: Only managers can assign leads to others';
        END IF;
        
        SELECT id INTO v_target_user_id 
        FROM public.users 
        WHERE user_id = p_target_auth_user_id 
        LIMIT 1;
        
        IF v_target_user_id IS NULL THEN
            RAISE EXCEPTION 'Target advisor not found';
        END IF;
    ELSE
        v_target_user_id := v_viewer_id;
    END IF;

    -- 3. Race condition check
    -- Ensure the lead is not already in users_leads
    IF EXISTS (SELECT 1 FROM public.users_leads WHERE lead_id = p_lead_id) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Lead already claimed by another advisor.', 
            'code', '409'
        );
    END IF;

    -- 4. Assignment logic
    INSERT INTO public.users_leads (lead_id, user_id)
    VALUES (p_lead_id, v_target_user_id);

    RETURN jsonb_build_object('success', true);
END;
$$;
