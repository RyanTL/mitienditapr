-- Make stock_qty optional on product_variants.
-- NULL means the vendor does not track inventory for that variant.
ALTER TABLE product_variants
  ALTER COLUMN stock_qty DROP NOT NULL,
  ALTER COLUMN stock_qty SET DEFAULT NULL;
