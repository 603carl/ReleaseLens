import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoRoot = path.join(projectRoot, 'demo-repository');
const gitDirectory = path.join(demoRoot, '.git');
const pricingPath = path.join(demoRoot, 'src', 'orders', 'pricing.ts');
const buggyPricing = readFileSync(pricingPath, 'utf8');
const buggyLine = 'return basePrice * (1 - discountPercent); // BUG: missing / 100';
const correctLine = 'return basePrice * (1 - discountPercent / 100);';

if (existsSync(gitDirectory)) {
  console.log('Demo repository Git history already exists.');
} else {
  if (!buggyPricing.includes(buggyLine)) {
    throw new Error('Cannot initialize demo Git history: expected discount defect was not found.');
  }

  const runGit = (args) =>
    execFileSync(
      'git',
      ['-c', 'user.name=ReleaseLens Demo', '-c', 'user.email=releaselens@demo.local', ...args],
      { cwd: demoRoot, stdio: 'inherit' },
    );

  try {
    execFileSync('git', ['init'], { cwd: demoRoot, stdio: 'inherit' });
    runGit(['branch', '-M', 'feature/discount-logic']);

    writeFileSync(pricingPath, buggyPricing.replace(buggyLine, correctLine));
    runGit(['add', '--', '.']);
    runGit(['commit', '-m', 'feat: initial order management API with pricing and invoice modules']);

    writeFileSync(pricingPath, buggyPricing);
    runGit(['add', '--', 'src/orders/pricing.ts']);
    runGit(['commit', '-m', 'feat: add promotional discount support to order pricing']);

    console.log('Initialized demo repository with its controlled two-commit history.');
  } catch (error) {
    rmSync(gitDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    writeFileSync(pricingPath, buggyPricing);
  }
}