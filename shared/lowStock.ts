/** A quantity at the threshold is considered low stock. */
export function isPantryItemLow(
  currentQuantity: number | null | undefined,
  lowStockThreshold: number | null | undefined,
): boolean {
  return currentQuantity != null && lowStockThreshold != null && currentQuantity <= lowStockThreshold;
}
