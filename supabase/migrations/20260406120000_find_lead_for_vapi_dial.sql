-- RPC for n8n: match a lead row using the same flexible digit matching idea as cold-call
-- (compare digits-only against business_telephone, mobile_phone, other_phone).
-- Used by scheduled workflow that syncs Vapi dialed numbers + pipeline stage.

CREATE OR REPLACE FUNCTION public.find_lead_for_vapi_dial(p_customer_number text)
RETURNS SETOF public.leads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT NULLIF(
      regexp_replace(trim(coalesce(p_customer_number, '')), '[^0-9]', '', 'g'),
      ''
    ) AS dial_digits
  )
  SELECT l.*
  FROM public.leads l, d
  WHERE d.dial_digits IS NOT NULL
    AND (
      regexp_replace(coalesce(l.business_telephone, ''), '[^0-9]', '', 'g') LIKE '%' || d.dial_digits || '%'
      OR regexp_replace(coalesce(l.mobile_phone, ''), '[^0-9]', '', 'g') LIKE '%' || d.dial_digits || '%'
      OR regexp_replace(coalesce(l.other_phone, ''), '[^0-9]', '', 'g') LIKE '%' || d.dial_digits || '%'
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_lead_for_vapi_dial(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_lead_for_vapi_dial(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_lead_for_vapi_dial(text) TO authenticated;

COMMENT ON FUNCTION public.find_lead_for_vapi_dial(text) IS
  'Match lead by Vapi customer.number (digits) against business_telephone, mobile_phone, other_phone.';
