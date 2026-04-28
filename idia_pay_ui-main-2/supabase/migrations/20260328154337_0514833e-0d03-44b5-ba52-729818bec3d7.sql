ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS individual_unit_size numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS individual_unit_uom text DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_unit_count numeric DEFAULT 0;