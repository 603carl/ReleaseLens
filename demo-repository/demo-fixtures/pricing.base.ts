/**
 * Order pricing logic.
 */

export interface OrderItem {
  id: string;
  price: number;
  quantity: number;
}

/**
 * Calculates discounted price.
 *
 * BUG: treats discountPercent as a fractional multiplier instead of a
 * percentage, so passing 10 subtracts 1000 % instead of 10 %.
 *   Correct:  basePrice * (1 - discountPercent / 100)
 *   Actual:   basePrice * (1 - discountPercent)
 */
export function calculateDiscount(
  basePrice: number,
  discountPercent: number
): number {
  return basePrice * (1 - discountPercent / 100);
}

/**
 * Calculates the total price for a list of order items with an optional
 * percentage discount applied to the subtotal.
 */
export function calculateOrderTotal(
  items: { price: number; quantity: number }[],
  discountPercent?: number
): number {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  if (discountPercent !== undefined) {
    return calculateDiscount(subtotal, discountPercent);
  }
  return subtotal;
}
