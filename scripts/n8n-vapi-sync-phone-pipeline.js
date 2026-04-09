/**
 * Generate n8n workflow: list Vapi outbound calls → filter (duration > 60s, not voicemail)
 * → RPC find_lead_for_vapi_dial → PATCH lead (correct business_telephone when digits differ;
 * set pipeline_stage = 1 Introduced when still 0/null).
 *
 * Prerequisites:
 * 1. Apply migration: supabase/migrations/20260406120000_find_lead_for_vapi_dial.sql
 * 2. In n8n: set HTTP credentials for Vapi (Bearer private key) on "Vapi: list calls".
 * 3. Supabase credential "Supabase People manager crm" must use a key that can call RPC + PATCH leads.
 *
 * Create workflow:
 *   node scripts/n8n-vapi-sync-phone-pipeline.js > /tmp/vapi_sync_workflow.json
 *   curl -sS -X POST "$N8N_URL/api/v1/workflows" \
 *     -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
 *     -d @/tmp/vapi_sync_workflow.json
 *
 * Env (optional overrides when generating):
 *   VAPI_ASSISTANT_ID   — default: cold-call assistant id from existing workflow
 *   VAPI_LOOKBACK_HOURS — default: 6 (window for createdAtGe)
 */
const crypto = require("crypto");
const fs = require("fs");

const uuid = () => crypto.randomUUID();

const VAPI_ASSISTANT_ID =
  process.env.VAPI_ASSISTANT_ID ||
  "1d7f287a-cc2c-4bb7-992e-0ba9e62bebae";
const LOOKBACK_HOURS = Number(process.env.VAPI_LOOKBACK_HOURS || 6);

const ids = {
  schedule: uuid(),
  window: uuid(),
  listVapi: uuid(),
  filter: uuid(),
  split: uuid(),
  rpc: uuid(),
  build: uuid(),
  patch: uuid(),
};

/** Same Supabase credential id as scripts/n8n-clone-cold-call-pipeline.js — replace in n8n if yours differs */
const SUPABASE_CRED = {
  supabaseApi: {
    id: "A77K6phEDCcYBcah",
    name: "Supabase People manager crm",
  },
};

const nodes = [
  {
    parameters: {
      rule: {
        interval: [{ field: "hours", hoursInterval: 6 }],
      },
    },
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [0, 0],
    id: ids.schedule,
    name: "Every 6 hours",
  },
  {
    parameters: {
      jsCode: `const h = ${JSON.stringify(LOOKBACK_HOURS)};
const createdAtGe = new Date(Date.now() - h * 3600 * 1000).toISOString();
return [{ json: { createdAtGe, assistantId: ${JSON.stringify(VAPI_ASSISTANT_ID)} } }];`,
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [220, 0],
    id: ids.window,
    name: "Window + assistantId",
  },
  {
    parameters: {
      url: "=https://api.vapi.ai/call?assistantId={{ $json.assistantId }}&limit=100&createdAtGe={{ encodeURIComponent($json.createdAtGe) }}",
      options: {},
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [440, 0],
    id: ids.listVapi,
    name: "Vapi: list calls",
    credentials: {
      httpHeaderAuth: {
        id: "REPLACE_VAPI_HTTP_HEADER_CRED_ID",
        name: "Vapi Private Key (Bearer)",
      },
    },
  },
  {
    parameters: {
      jsCode: `const j = $input.first().json;
const raw = Array.isArray(j) ? j : (j.body ?? j.data ?? j.calls ?? j);
const arr = Array.isArray(raw) ? raw : [];
const out = [];
for (const c of arr) {
  const sec = Number(c.durationSeconds ?? ((c.durationMs ?? 0) / 1000));
  const reason = String(c.endedReason ?? "").toLowerCase();
  if (sec <= 60) continue;
  if (reason === "voicemail") continue;
  const num = c.customer?.number;
  if (!num) continue;
  out.push({ json: c });
}
return out;`,
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [660, 0],
    id: ids.filter,
    name: "Filter: >60s, not voicemail, has number",
  },
  {
    parameters: {
      batchSize: 1,
      options: {},
    },
    type: "n8n-nodes-base.splitInBatches",
    typeVersion: 3,
    position: [880, 0],
    id: ids.split,
    name: "SplitInBatches",
  },
  {
    parameters: {
      method: "POST",
      url: "={{ $credentials.supabaseApi.host }}/rest/v1/rpc/find_lead_for_vapi_dial",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "apikey", value: "={{ $credentials.supabaseApi.serviceRole }}" },
          {
            name: "Authorization",
            value: "={{ 'Bearer ' + $credentials.supabaseApi.serviceRole }}",
          },
          { name: "Prefer", value: "return=representation" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        '={{ JSON.stringify({ p_customer_number: $json.customer?.number || "" }) }}',
      options: {},
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1100, 0],
    id: ids.rpc,
    name: "Supabase RPC: find_lead_for_vapi_dial",
    credentials: SUPABASE_CRED,
  },
  {
    parameters: {
      jsCode: `const vapi = $('SplitInBatches').item.json;
const rows = $input.first().json;
const lead = Array.isArray(rows) && rows.length ? rows[0] : null;
if (!lead) return [];
function norm(s) {
  return String(s ?? "").replace(/[^0-9]/g, "");
}
const dial = vapi.customer?.number || "";
if (!dial) return [];
const needPhone = norm(dial) !== norm(lead.business_telephone);
const shouldStage = lead.pipeline_stage == null || lead.pipeline_stage === 0;
if (!needPhone && !shouldStage) return [];
const updates = {};
if (needPhone) updates.business_telephone = dial;
if (shouldStage) {
  updates.pipeline_stage = 1;
  updates.pipeline_stage_updated_at = new Date().toISOString();
}
return [{ json: { leadId: lead.id, updates } }];`,
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1320, 0],
    id: ids.build,
    name: "Build PATCH (phone + stage)",
  },
  {
    parameters: {
      method: "PATCH",
      url: "={{ $credentials.supabaseApi.host }}/rest/v1/leads?id=eq.{{ $json.leadId }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "apikey", value: "={{ $credentials.supabaseApi.serviceRole }}" },
          {
            name: "Authorization",
            value: "={{ 'Bearer ' + $credentials.supabaseApi.serviceRole }}",
          },
          { name: "Prefer", value: "return=minimal" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.updates) }}",
      options: {},
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1540, 0],
    id: ids.patch,
    name: "Supabase PATCH leads",
    credentials: SUPABASE_CRED,
  },
];

const connections = {
  "Every 6 hours": {
    main: [[{ node: "Window + assistantId", type: "main", index: 0 }]],
  },
  "Window + assistantId": {
    main: [[{ node: "Vapi: list calls", type: "main", index: 0 }]],
  },
  "Vapi: list calls": {
    main: [[{ node: "Filter: >60s, not voicemail, has number", type: "main", index: 0 }]],
  },
  "Filter: >60s, not voicemail, has number": {
    main: [[{ node: "SplitInBatches", type: "main", index: 0 }]],
  },
  SplitInBatches: {
    main: [
      [
        {
          node: "Supabase RPC: find_lead_for_vapi_dial",
          type: "main",
          index: 0,
        },
      ],
      [],
    ],
  },
  "Supabase RPC: find_lead_for_vapi_dial": {
    main: [[{ node: "Build PATCH (phone + stage)", type: "main", index: 0 }]],
  },
  "Build PATCH (phone + stage)": {
    main: [[{ node: "Supabase PATCH leads", type: "main", index: 0 }]],
  },
  "Supabase PATCH leads": {
    main: [[{ node: "SplitInBatches", type: "main", index: 0 }]],
  },
};

const workflow = {
  name: "PM CRM: Vapi sync — phone + pipeline Introduced (>60s, not voicemail)",
  nodes,
  connections,
  settings: {
    executionOrder: "v1",
    timezone: "Europe/London",
  },
};

const outPath = "/tmp/n8n_vapi_sync_workflow.json";
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 0));
process.stdout.write(JSON.stringify(workflow, null, 2));
process.stderr.write(
  `\nWrote ${outPath}\nReplace REPLACE_VAPI_HTTP_HEADER_CRED_ID with your n8n credential id for Vapi Bearer token.\nVerify Supabase credential uses Host + Service Role (expressions: $credentials.supabaseApi.host / .serviceRole).\n`
);
