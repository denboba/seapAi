-- Create notices table to store procurement notices
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_notice_id BIGINT UNIQUE NOT NULL,
  notice_no TEXT NOT NULL,
  contracting_authority TEXT NOT NULL,
  contract_title TEXT NOT NULL,
  short_description TEXT,
  publication_date TIMESTAMP WITH TIME ZONE,
  finalization_date TIMESTAMP WITH TIME ZONE,
  estimated_value NUMERIC(15, 2),
  ron_contract_value NUMERIC(15, 2),
  procedure_type TEXT,
  cpv_code TEXT,
  risk_score INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vendors table to track suppliers
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT UNIQUE NOT NULL,
  fiscal_code TEXT,
  total_contracts INTEGER DEFAULT 0,
  total_value NUMERIC(15, 2) DEFAULT 0,
  average_contract_value NUMERIC(15, 2) DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0,
  high_risk_count INTEGER DEFAULT 0,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contracts table to store contract awards
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  contract_title TEXT NOT NULL,
  contract_value NUMERIC(15, 2),
  currency TEXT DEFAULT 'RON',
  award_date TIMESTAMP WITH TIME ZONE,
  contract_number TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create risk_history table to track risk changes over time
CREATE TABLE IF NOT EXISTS public.risk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (public procurement data)
CREATE POLICY "Public notices are viewable by everyone" 
  ON public.notices FOR SELECT 
  USING (true);

CREATE POLICY "Public vendors are viewable by everyone" 
  ON public.vendors FOR SELECT 
  USING (true);

CREATE POLICY "Public contracts are viewable by everyone" 
  ON public.contracts FOR SELECT 
  USING (true);

CREATE POLICY "Public risk history is viewable by everyone" 
  ON public.risk_history FOR SELECT 
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_notices_ca_notice_id ON public.notices(ca_notice_id);
CREATE INDEX idx_notices_publication_date ON public.notices(publication_date DESC);
CREATE INDEX idx_notices_risk_score ON public.notices(risk_score DESC);
CREATE INDEX idx_notices_estimated_value ON public.notices(estimated_value DESC);
CREATE INDEX idx_contracts_notice_id ON public.contracts(notice_id);
CREATE INDEX idx_contracts_vendor_id ON public.contracts(vendor_id);
CREATE INDEX idx_vendors_name ON public.vendors(vendor_name);
CREATE INDEX idx_risk_history_notice_id ON public.risk_history(notice_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();