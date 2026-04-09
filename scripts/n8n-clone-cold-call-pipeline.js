/**
 * Clone PM CRM Cold Call Analysis VAPI from exported JSON:
 * - New webhook id
 * - After **Voicemail or Not Answered?** false branch (AI voicemail check, not Vapi-only),
 *   if call duration > 60s → Supabase update leads.pipeline_stage = 1 (Introduced)
 * Usage: node scripts/n8n-clone-cold-call-pipeline.js <export.json>
 */
const fs = require("fs");
const crypto = require("crypto");

const srcPath = process.argv[2];
if (!srcPath) {
  console.error("Usage: node n8n-clone-cold-call-pipeline.js <export.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
const data = raw.data ?? raw;
const newWebhookId = crypto.randomUUID();

const ifId = crypto.randomUUID();
const supaId = crypto.randomUUID();
const condId = crypto.randomUUID();

const ifDurationNode = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: "",
        typeValidation: "strict",
        version: 2,
      },
      conditions: [
        {
          id: condId,
          leftValue:
            "={{ Number($('Webhook').first().json.body?.message?.call?.durationSeconds ?? (($('Webhook').first().json.body?.message?.call?.durationMs ?? 0) / 1000)) }}",
          rightValue: 60,
          operator: {
            type: "number",
            operation: "gt",
          },
        },
      ],
      combinator: "and",
    },
    options: {},
  },
  type: "n8n-nodes-base.if",
  typeVersion: 2.2,
  position: [-80, 280],
  id: ifId,
  name: "Pipeline: call > 60s?",
};

const pipelineUpdateNode = {
  parameters: {
    operation: "update",
    tableId: "leads",
    filters: {
      conditions: [
        {
          keyName: "id",
          condition: "eq",
          keyValue:
            "={{ $('Get Lead - Flexible Search').first().json.id }}",
        },
      ],
    },
    fieldsUi: {
      fieldValues: [
        { fieldId: "pipeline_stage", fieldValue: "1" },
        { fieldId: "pipeline_stage_updated_at", fieldValue: "={{ $now.toISO() }}" },
      ],
    },
  },
  type: "n8n-nodes-base.supabase",
  typeVersion: 1,
  position: [140, 180],
  id: supaId,
  name: "Pipeline → Introduced (stage 1)",
  credentials: {
    supabaseApi: {
      id: "A77K6phEDCcYBcah",
      name: "Supabase People manager crm",
    },
  },
};

const nodes = data.nodes.map((n) => {
  if (n.name === "Webhook" && n.type === "n8n-nodes-base.webhook") {
    return {
      ...n,
      parameters: {
        ...n.parameters,
        path: newWebhookId,
      },
      webhookId: newWebhookId,
    };
  }
  return n;
});

nodes.push(ifDurationNode, pipelineUpdateNode);

const connections = structuredClone(data.connections);

const voicemail = connections["Voicemail or Not Answered?"];
if (!voicemail?.main?.[1]?.length) {
  console.error(
    "Could not find Voicemail or Not Answered? false branch (→ If3)"
  );
  process.exit(1);
}

// False branch = treated as not voicemail by your AI rules; parallel to If3
voicemail.main[1].push({
  node: "Pipeline: call > 60s?",
  type: "main",
  index: 0,
});

connections["Pipeline: call > 60s?"] = {
  main: [
    [
      {
        node: "Pipeline → Introduced (stage 1)",
        type: "main",
        index: 0,
      },
    ],
    [],
  ],
};

// POST /workflows rejects some settings keys (e.g. callerPolicy); omit or keep minimal.
const out = {
  name: "PM CRM : Cold Call Analysis VAPI (COPY — pipeline Introduced if >60s)",
  nodes,
  connections,
  settings: {
    executionOrder: "v1",
    timezone: "Europe/London",
  },
};

fs.writeFileSync("/tmp/n8n_workflow_create_payload.json", JSON.stringify(out));
console.log(JSON.stringify({ newWebhookPath: newWebhookId, nodeCount: nodes.length }));
