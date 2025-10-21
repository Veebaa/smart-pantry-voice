-- ===================================
-- Pantry Items Stock Level Migrations
-- ===================================

-- 1. Convert existing columns to DOUBLE PRECISION (floats)
ALTER TABLE public.pantry_items
  ALTER COLUMN current_quantity TYPE DOUBLE PRECISION USING current_quantity::double precision,
  ALTER COLUMN low_stock_threshold TYPE DOUBLE PRECISION USING low_stock_threshold::double precision;

-- 2. Add comments for clarity
COMMENT ON COLUMN public.pantry_items.current_quantity IS 'Current numeric quantity of the item (supports decimals)';
COMMENT ON COLUMN public.pantry_items.low_stock_threshold IS 'Threshold quantity - when current quantity falls below this, item is marked as low (supports decimals)';

-- 3. Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_check_low_stock ON public.pantry_items;
DROP FUNCTION IF EXISTS public.check_low_stock();

-- 4. Create or replace function to automatically check low stock (works with floats)
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if both quantities are set
  IF NEW.current_quantity IS NOT NULL AND NEW.low_stock_threshold IS NOT NULL THEN
    -- Mark item as low if current_quantity <= threshold
    IF NEW.current_quantity <= NEW.low_stock_threshold THEN
      NEW.is_low = TRUE;
    ELSE
      NEW.is_low = FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Recreate trigger for INSERT or UPDATE on quantity fields
CREATE TRIGGER trigger_check_low_stock
BEFORE INSERT OR UPDATE OF current_quantity, low_stock_threshold
ON public.pantry_items
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock();
