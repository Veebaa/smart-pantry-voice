-- Add low_stock_threshold column to pantry_items
ALTER TABLE public.pantry_items 
ADD COLUMN low_stock_threshold integer DEFAULT NULL;

COMMENT ON COLUMN public.pantry_items.low_stock_threshold IS 'Threshold quantity - when current quantity falls below this, item is marked as low';

-- Add current_quantity column to track numeric quantities
ALTER TABLE public.pantry_items 
ADD COLUMN current_quantity integer DEFAULT NULL;

COMMENT ON COLUMN public.pantry_items.current_quantity IS 'Current numeric quantity of the item';

-- Create or replace function to automatically check low stock
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- If both current_quantity and threshold are set, check if low
  IF NEW.current_quantity IS NOT NULL AND NEW.low_stock_threshold IS NOT NULL THEN
    IF NEW.current_quantity <= NEW.low_stock_threshold THEN
      NEW.is_low = true;
    ELSE
      NEW.is_low = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update is_low when quantities change
CREATE TRIGGER trigger_check_low_stock
  BEFORE INSERT OR UPDATE OF current_quantity, low_stock_threshold
  ON public.pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock();