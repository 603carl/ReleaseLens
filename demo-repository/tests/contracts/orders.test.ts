import { describe, it, expect } from 'vitest';
import { calculateOrderTotal } from '../../src/orders/pricing.js';

describe('Order pricing contracts', () => {
  it('contract: order total with 10% discount should equal 90', () => {
    // Business contract: items totalling 100 with 10% discount must equal 90.
    const items = [{ price: 100, quantity: 1 }];
    const total = calculateOrderTotal(items, 10);
    // Due to the bug in calculateDiscount (missing /100), the actual result is
    // 100 * (1 - 10) = -900, which breaks this contract.
    expect(total).toBe(90);
  });
});
