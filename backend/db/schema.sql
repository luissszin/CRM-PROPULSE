-- backend/db/schema.sql
-- Supabase schema for CRM
-- Run in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Tabela de Unidades (Multi-tenant)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_units_slug ON units(slug);
-- Tabela de Contatos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone);
-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  -- super_admin | unit_admin | agent
  unit_id UUID REFERENCES units(id) ON DELETE
  SET NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_unit ON users (unit_id);
-- Tabela de Conexões do WhatsApp (Multi-provider)
CREATE TABLE IF NOT EXISTS unit_whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zapi', 'evolution', 'meta')),
  instance_id TEXT,
  phone_number TEXT,
  access_token TEXT,
  business_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (
    status IN (
      'disconnected',
      'connecting',
      'connected',
      'error'
    )
  ),
  qr_code TEXT,
  provider_config JSONB DEFAULT '{}',
  webhook_secret TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_unit ON unit_whatsapp_connections(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_provider ON unit_whatsapp_connections(provider);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_instance ON unit_whatsapp_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_status ON unit_whatsapp_connections(status);
-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE
  SET NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    -- new | contacted | qualified | lost | won
    assigned_to TEXT,
    -- user id or name
    value NUMERIC DEFAULT 0,
    tags TEXT [],
    avatar TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_unit ON leads (unit_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE
  SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE
  SET NULL,
    external_id TEXT,
    -- ID da conversa no provedor externo
    channel TEXT,
    -- 'whatsapp', 'instagram', 'messenger', 'web'
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_unit ON conversations (unit_id);
CREATE INDEX IF NOT EXISTS idx_conversations_instance ON conversations (instance_id);
-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  -- 'agent' or 'customer'
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | sent | delivered | read | failed
  external_id TEXT,
  -- ID da mensagem no provedor externo
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages (external_id);
-- Tabela de Automações
CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  -- e.g., 'new_lead', 'stage_change', 'new_message'
  trigger_config JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_flows_unit ON automation_flows(unit_id);
-- Tabela de Logs de Automação
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE
  SET NULL,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    -- 'success', 'error'
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_logs_flow ON automation_logs (flow_id);