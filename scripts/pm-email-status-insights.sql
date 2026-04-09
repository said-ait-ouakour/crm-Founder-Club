-- PeopleManager / public.email_messages — diagnostics for inbox status labels
-- Run via Supabase SQL editor or MCP: crm-PeopleManager-supabase → execute_sql

-- 1) Columns (verify names before grouping)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'email_messages'
ORDER BY ordinal_position;

-- 2) Status × direction counts
SELECT COALESCE(status::text, '(null)') AS status,
       COALESCE(direction::text, '(null)') AS direction,
       COUNT(*)::bigint AS cnt
FROM public.email_messages
GROUP BY status, direction
ORDER BY cnt DESC NULLS LAST;

-- 3) Outbound rows missing status (often show as "Pending" in UI after fixes)
SELECT COUNT(*)::bigint AS outbound_total,
       COUNT(*) FILTER (WHERE status IS NULL)::bigint AS outbound_null_status
FROM public.email_messages
WHERE direction = 'Outbound';

-- 4) RPC used by LeadConversationPanel / omnichat email bundle
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_lead_conversation_bundle'
LIMIT 1;
