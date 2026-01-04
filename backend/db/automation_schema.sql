-- Automation Flows Table
CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- e.g., 'new_lead', 'stage_change', 'new_message'
  trigger_config JSONB DEFAULT '{}', -- e.g., { "stage": "won" }
  actions JSONB DEFAULT '[]', -- e.g., [{ "type": "send_whatsapp", "template": "Olá!" }]
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Logs Table for tracking
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success', 'error'
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_flows_unit ON automation_flows(unit_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_unit ON automation_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger ON automation_flows(trigger_type);
