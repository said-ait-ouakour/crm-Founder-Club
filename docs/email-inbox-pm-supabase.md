# Email inbox status — PeopleManager Supabase (MCP / SQL)

This doc summarizes what the **lead detail inbox** (`LeadConversationPanel` / `get_lead_conversation_bundle`) reads from Postgres, and gives **copy-paste SQL** you can run with the **Cursor MCP server** `crm-PeopleManager-supabase` (`execute_sql`) or any SQL client.

## `public.email_messages` (actual columns, PM)

| Column             | Type        | Notes |
|--------------------|-------------|--------|
| `id`               | bigint PK   | |
| `created_at`       | timestamptz | default `now()` |
| `message_id`       | text        | SendGrid message id |
| `conversation_id`  | bigint      | FK to `email_conversation` |
| `direction`        | varchar     | e.g. `Inbound` / `Outbound` |
| `status`           | varchar     | Delivery / engagement (see below) |
| `last_update`      | timestamptz | |
| `content`          | text        | HTML body |
| `subject`          | varchar     | |
| `clicks_count`     | numeric     | **Not** `click_count` |
| `open_count`       | numeric     | |
| `marked_as_spam`   | boolean     | |
| `unsubscribed`     | boolean     | |
| `mpp_opens_count`  | numeric     | |
| `sender` / `receiver` | text     | |

There is **no** `event_name` column on this table in PM. Bounces are represented via **`status = 'bounce'`**.

## `get_lead_conversation_bundle`

- Picks the **active** `email_conversation` for the lead (prefers one that already has `email_messages`, then newest).
- Returns `email_messages` as **`jsonb_agg(to_jsonb(em.*))`** — i.e. whatever columns exist on `email_messages` (no `event_name`).

## Status distribution (sample MCP `execute_sql` result)

Run:

```sql
SELECT COALESCE(status::text, '(null)') AS status,
       COALESCE(direction::text, '(null)') AS direction,
       COUNT(*)::bigint AS cnt
FROM public.email_messages
GROUP BY status, direction
ORDER BY cnt DESC;
```

Observed shapes include **outbound** rows with `status` in:

`delivered`, `open`, `bounce`, `sent`, `(null)`, `not_delivered`, `processed` — plus **inbound** with `(null)` status.

Counts are time-varying; re-run the query on the project for current numbers.

## Outbound “stuck on Sending” (root cause)

The UI used to treat any status other than a small allowlist as **“Sending…”**. In PM, **`sent`** and **`processed`** are common SendGrid-style values; **`null`** appears on ~100+ outbound rows until webhooks backfill status.

**App fixes (repo):**

- Map **`clicks_count`** → click display (`msg.clicks_count ?? msg.click_count`).
- Show **Sent**, **Processing**, and **Pending** instead of mislabeling those as “Sending…”.
- **`POST /api/send-email`** sets **`status: 'sent'`** on insert so new rows are not left `null` by default.

## MCP: column inspection

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'email_messages'
ORDER BY ordinal_position;
```

## MCP: RPC definition

```sql
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_lead_conversation_bundle'
LIMIT 1;
```

## Related UI entry points

- Lead page right column: `components/lead-conversation-panel.tsx` (RPC bundle).
- Legacy inbox: `app/leads/[id]/inbox/page.tsx` (direct `email_messages` select) — aligned to the same status + `clicks_count` rules.
