/**
 * Invoice generation for orders.
 */

import { calculateOrderTotal, OrderItem } from '../orders/pricing.js';

export interface Invoice {
  id: string;
  orderId: string;
  total: number;
  generatedAt: string;
}

/**
 * Generates an invoice for the given order.
 */
export function generateInvoice(
  orderId: string,
  items: OrderItem[],
  discountPercent?: number
): Invoice {
  const total = calculateOrderTotal(items, discountPercent);
  return {
    id: `INV-${Date.now()}`,
    orderId,
    total,
    generatedAt: new Date().toISOString(),
  };
}
