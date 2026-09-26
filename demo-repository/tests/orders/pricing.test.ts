import { describe, it, expect } from 'vitest';
import { calculateDiscount, calculateOrderTotal } from '../../src/orders/pricing.js';

describe('calculateDiscount', () => {
  it('applies no discount when discountPercent is 0', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('returns 0 when discountPercent is 1 (100% off in buggy impl)', () => {
    // The buggy implementation treats 1 as "100% off"
    expect(calculateDiscount(200, 1)).toBe(0);
  });

  it('returns negative for discountPercent > 1 in buggy impl', () => {
    // With the bug, anything > 1 produces a negative result
    expect(calculateDiscount(100, 1.5)).toBe(-50);
  });
});

describe('calculateOrderTotal', () => {
  it('sums item prices and quantities with no discount', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 4 },
    ];
    expect(calculateOrderTotal(items)).toBe(40);
  });

  it('returns subtotal unchanged when discountPercent is 0', () => {
    const items = [{ price: 50, quantity: 2 }];
    expect(calculateOrderTotal(items, 0)).toBe(100);
  });

  it('calculates total for single item with no discount', () => {
    const items = [{ price: 25, quantity: 3 }];
    expect(calculateOrderTotal(items)).toBe(75);
  });
});
