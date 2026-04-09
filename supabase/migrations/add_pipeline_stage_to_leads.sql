-- Migration: add pipeline_stage and pipeline_stage_updated_at to leads
-- pipeline_stage tracks the Omniflow pipeline (0–8)
-- pipeline_stage_updated_at records when the stage last changed (used for time-in-stage KPI)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
