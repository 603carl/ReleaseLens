import os from 'node:os';
import path from 'node:path';

export const VERCEL_DEMO_REPO_PATH = path.join(os.tmpdir(), 'releaselens-demo-repository');
export const DEMO_CHANGED_FILE = 'src/orders/pricing.ts';
export const DEMO_CHANGE_DIFF = [
  'diff --git a/src/orders/pricing.ts b/src/orders/pricing.ts',
  'index 803023a..7676f1c 100644',
  '--- a/src/orders/pricing.ts',
  '+++ b/src/orders/pricing.ts',
  '@@ -20,7 +20,7 @@ export function calculateDiscount(',
  '   basePrice: number,',
  '   discountPercent: number',
  ' ): number {',
  '-  return basePrice * (1 - discountPercent / 100);',
  '+  return basePrice * (1 - discountPercent); // BUG: missing / 100',
  ' }',
].join('\n');

export function isVercelDemoRepository(repositoryPath: string): boolean {
  return process.env.VERCEL === '1' && path.resolve(repositoryPath) === VERCEL_DEMO_REPO_PATH;
}
