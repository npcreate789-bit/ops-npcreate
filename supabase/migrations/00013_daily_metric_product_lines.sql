-- Multiple SKU / product lines per daily ads report

ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS product_lines JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.daily_metrics.product_lines IS
  'Array of { product_name, sku?, orders?, gmv? } per SKU for the report day';
