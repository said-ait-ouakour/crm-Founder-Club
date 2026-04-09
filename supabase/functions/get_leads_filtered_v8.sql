-- MASTER RPC: get_leads_filtered_v8
-- This version resolves PGRST203 ambiguity and centralizes Manager visibility bypass + 'Called By' filtering.

DROP FUNCTION IF EXISTS public.get_leads_filtered_v8;

CREATE OR REPLACE FUNCTION public.get_leads_filtered_v8(
    p_search TEXT DEFAULT NULL,
    p_lead_source TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_progress TEXT DEFAULT NULL,
    p_industry TEXT DEFAULT NULL,
    p_sic TEXT DEFAULT NULL,
    p_employees_band TEXT DEFAULT NULL,
    p_modeled_turnover_band TEXT DEFAULT NULL,
    p_engaged BOOLEAN DEFAULT NULL,
    p_guide_sent TEXT DEFAULT NULL,
    p_created_from TIMESTAMPTZ DEFAULT NULL,
    p_created_to TIMESTAMPTZ DEFAULT NULL,
    p_advisor_user_id UUID DEFAULT NULL,
    p_unassigned BOOLEAN DEFAULT NULL,
    p_visibility_scope TEXT DEFAULT NULL,
    p_share_status TEXT DEFAULT NULL,
    p_sentiment TEXT DEFAULT NULL,
    p_has_notes BOOLEAN DEFAULT NULL,
    p_has_call BOOLEAN DEFAULT NULL,
    p_vapi_score TEXT DEFAULT NULL,
    p_followed_up BOOLEAN DEFAULT NULL,
    p_email_opened BOOLEAN DEFAULT NULL,
    p_sms_answered BOOLEAN DEFAULT NULL,
    p_whatsapp_answered BOOLEAN DEFAULT NULL,
    p_inbound_email TEXT DEFAULT NULL,
    p_inbound_whatsapp TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_sort_key TEXT DEFAULT 'created_on',
    p_sort_dir TEXT DEFAULT 'desc',
    p_called_by TEXT[] DEFAULT NULL,
    -- Compatibility params
    p_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE (
    lead JSONB,
    users_leads JSONB,
    lead_situation JSONB,
    calls JSONB,
    email_conversation JSONB,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_viewer_id BIGINT;
    v_viewer_auth_id UUID;
    v_viewer_role TEXT;
    v_offset INTEGER;
BEGIN
    -- 1. Identify viewer and role
    v_viewer_auth_id := auth.uid();
    
    SELECT id, role INTO v_viewer_id, v_viewer_role 
    FROM public.users 
    WHERE user_id = v_viewer_auth_id 
    LIMIT 1;

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    WITH filtered_leads AS (
        SELECT l.*
        FROM public.leads l
        WHERE 
            -- SEARCH
            (p_search IS NULL OR (
                l.business_name ILIKE '%' || p_search || '%' OR
                l.contact_first_name ILIKE '%' || p_search || '%' OR
                l.contact_last_name ILIKE '%' || p_search || '%' OR
                l.contact_email ILIKE '%' || p_search || '%' OR
                l.company_email ILIKE '%' || p_search || '%' OR
                l.business_telephone ILIKE '%' || p_search || '%'
            ))
            -- BASIC FILTERS
            AND (p_lead_source IS NULL OR l.lead_source = p_lead_source)
            AND (p_status IS NULL OR l.current_status = p_status)
            AND (p_progress IS NULL OR l.current_progress = p_progress)
            AND (p_industry IS NULL OR l.industry = p_industry)
            AND (p_sic IS NULL OR l.sic_07_code = p_sic)
            AND (p_employees_band IS NULL OR l.employees_band_desc = p_employees_band)
            AND (p_modeled_turnover_band IS NULL OR l.modeled_turnover_band_desc = p_modeled_turnover_band)
            AND (p_engaged IS NULL OR l.engaged = p_engaged)
            AND (p_created_from IS NULL OR l.created_on >= p_created_from)
            AND (p_created_to IS NULL OR l.created_on < p_created_to)
            
            -- VISIBILITY & ASSIGNMENT
            AND (
                -- MANAGER/ADMIN BYPASS
                (v_viewer_role IN ('manager', 'admin'))
                OR
                -- ADVISOR VISIBILITY: Assigned leads OR Shared leads
                (EXISTS (
                    SELECT 1 FROM public.users_leads ul 
                    WHERE ul.lead_id = l.id AND ul.user_id = v_viewer_id
                ))
                OR
                (EXISTS (
                    SELECT 1 FROM public.lead_shares ls 
                    WHERE ls.lead_id = l.id AND ls.user_id = v_viewer_id
                ))
            )

            -- ADVISOR FILTER
            AND (p_advisor_user_id IS NULL OR EXISTS (
                SELECT 1 FROM public.users u2
                JOIN public.users_leads ul2 ON ul2.user_id = u2.id
                WHERE ul2.lead_id = l.id AND u2.user_id = p_advisor_user_id
            ))

            -- UNASSIGNED FILTER
            AND (p_unassigned IS NULL OR (
                p_unassigned = TRUE AND NOT EXISTS (SELECT 1 FROM public.users_leads WHERE lead_id = l.id)
            ))

            -- CALLED BY FILTER (EXISTS logic)
            AND (p_called_by IS NULL OR array_length(p_called_by, 1) IS NULL OR EXISTS (
                SELECT 1 FROM public.calls c
                WHERE c.lead_id = l.id 
                AND EXISTS (
                    SELECT 1 FROM unnest(p_called_by) AS cb
                    WHERE c.advisor_name ILIKE '%' || cb || '%'
                )
            ))

            -- SITUATION / NOTES / SENTIMENT
            AND (p_sentiment IS NULL OR EXISTS (
                SELECT 1 FROM public.lead_situation s 
                WHERE s.lead_id = l.id AND s.sentiment_analysis = p_sentiment
            ))
            AND (p_has_notes IS NULL OR (
                p_has_notes = TRUE AND EXISTS (
                    SELECT 1 FROM public.lead_situation s 
                    WHERE s.lead_id = l.id AND (NULLIF(s.next_steps, '') IS NOT NULL OR NULLIF(s.advisor_notes, '') IS NOT NULL)
                )
            ))

            -- CALL FILTERS
            AND (p_has_call IS NULL OR (
                (p_has_call = TRUE AND EXISTS (SELECT 1 FROM public.calls c WHERE c.lead_id = l.id)) OR
                (p_has_call = FALSE AND NOT EXISTS (SELECT 1 FROM public.calls c WHERE c.lead_id = l.id))
            ))
            AND (p_vapi_score IS NULL OR EXISTS (
                SELECT 1 FROM public.calls c 
                WHERE c.lead_id = l.id AND c.advisor_name = 'Charlotte Fox Vapi' AND (
                    (p_vapi_score = '0-4' AND c.call_score >= 0 AND c.call_score < 4) OR
                    (p_vapi_score = '4-7' AND c.call_score >= 4 AND c.call_score <= 7) OR
                    (p_vapi_score = '7-10' AND c.call_score > 7 AND c.call_score <= 10)
                )
            ))
    ),
    paged_leads AS (
        SELECT *, count(*) OVER() AS full_count
        FROM filtered_leads
        ORDER BY 
            CASE WHEN p_sort_dir = 'asc' THEN
                CASE 
                    WHEN p_sort_key = 'created_on' THEN created_on::text
                    WHEN p_sort_key = 'business_name' THEN business_name
                    ELSE created_on::text
                END
            END ASC NULLS LAST,
            CASE WHEN p_sort_dir = 'desc' THEN
                CASE 
                    WHEN p_sort_key = 'created_on' THEN created_on::text
                    WHEN p_sort_key = 'business_name' THEN business_name
                    ELSE created_on::text
                END
            END DESC NULLS FIRST
        LIMIT p_page_size
        OFFSET v_offset
    )
    SELECT 
        to_jsonb(pl.*) - 'full_count' as lead,
        (
            SELECT jsonb_build_object(
                'lead_id', ul.lead_id,
                'user_id', ul.user_id,
                'advisor_name', u.fullname,
                'advisor_email', u.email
            )
            FROM public.users_leads ul
            JOIN public.users u ON u.id = ul.user_id
            WHERE ul.lead_id = pl.id
            LIMIT 1
        ) as users_leads,
        (
            SELECT to_jsonb(ls.*)
            FROM public.lead_situation ls
            WHERE ls.lead_id = pl.id
            ORDER BY ls.created_at DESC
            LIMIT 1
        ) as lead_situation,
        (
            SELECT to_jsonb(c.*)
            FROM public.calls c
            WHERE c.lead_id = pl.id
            ORDER BY c.created_at DESC
            LIMIT 1
        ) as calls,
        (
            SELECT to_jsonb(ec.*)
            FROM public.email_conversation ec
            WHERE ec.lead_id = pl.id
            LIMIT 1
        ) as email_conversation,
        pl.full_count as total_count
    FROM paged_leads pl;
END;
$$;
