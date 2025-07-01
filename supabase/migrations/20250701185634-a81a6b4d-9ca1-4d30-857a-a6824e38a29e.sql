
-- Add missing columns to properties table
ALTER TABLE public.properties 
ADD COLUMN property_name TEXT NOT NULL DEFAULT '',
ADD COLUMN address TEXT NOT NULL DEFAULT '';
