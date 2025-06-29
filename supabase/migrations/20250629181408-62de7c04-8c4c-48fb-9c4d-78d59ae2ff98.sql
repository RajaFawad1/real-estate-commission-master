
-- Add referral tracking columns to people table
ALTER TABLE public.people ADD COLUMN referred_by UUID REFERENCES public.people(id);
ALTER TABLE public.people ADD COLUMN referral_level INTEGER DEFAULT 1;

-- Add sold_by column to properties table
ALTER TABLE public.properties ADD COLUMN sold_by UUID REFERENCES public.people(id);

-- Create referral_commissions table to track referral-based commissions
CREATE TABLE public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  referral_level INTEGER NOT NULL CHECK (referral_level >= 1 AND referral_level <= 5),
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL, 
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_levels table to define commission percentages for each level
CREATE TABLE public.referral_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level)
);

-- Insert default referral commission percentages
INSERT INTO public.referral_levels (level, commission_percentage) VALUES
(1, 5.0),  -- Level 1: 5%
(2, 3.0),  -- Level 2: 3%
(3, 2.0),  -- Level 3: 2%
(4, 1.5),  -- Level 4: 1.5%
(5, 1.0);  -- Level 5: 1%

-- Enable RLS on new tables
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_levels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Admins can manage referral_commissions" ON public.referral_commissions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage referral_levels" ON public.referral_levels FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_people_referred_by ON public.people(referred_by);
CREATE INDEX idx_properties_sold_by ON public.properties(sold_by);
CREATE INDEX idx_referral_commissions_property_id ON public.referral_commissions(property_id);
CREATE INDEX idx_referral_commissions_referrer_id ON public.referral_commissions(referrer_id);

-- Create function to calculate referral chain
CREATE OR REPLACE FUNCTION public.get_referral_chain(seller_id UUID)
RETURNS TABLE(
  person_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE referral_chain AS (
    -- Base case: start with the seller
    SELECT 
      p.id,
      p.username,
      p.first_name,
      p.last_name,
      1 as level,
      p.referred_by
    FROM public.people p
    WHERE p.id = seller_id
    
    UNION ALL
    
    -- Recursive case: get referrers up to 5 levels
    SELECT 
      p.id,
      p.username,
      p.first_name,
      p.last_name,
      rc.level + 1,
      p.referred_by
    FROM public.people p
    INNER JOIN referral_chain rc ON p.id = rc.referred_by
    WHERE rc.level < 5
  )
  SELECT 
    rc.id,
    rc.username,
    rc.first_name,
    rc.last_name,
    rc.level
  FROM referral_chain rc
  WHERE rc.level > 1  -- Exclude the seller (level 1)
  ORDER BY rc.level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
