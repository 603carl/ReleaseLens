/**
 * Input validation utilities for order management.
 */

const unusedHelper = (x: unknown) => String(x);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a given string is a well-formed UUID.
 */
export function validateOrderId(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validates that amount is a finite positive number.
 */
export function validateAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}
