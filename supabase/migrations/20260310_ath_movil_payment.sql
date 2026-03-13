-- Add ATH Movil phone number to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS ath_movil_phone text;

-- Add payment method to orders (nullable for back-compat with existing orders)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Index for efficient vendor order badge queries
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status
  ON public.orders(vendor_status);
