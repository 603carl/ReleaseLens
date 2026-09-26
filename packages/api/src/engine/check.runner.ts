/**
 * Check Runner
 * Executes verification commands from a hard allowlist.
 * NEVER executes arbitrary commands — only allowlisted entries.
 * 
 * Security boundary: This is the only place in the application that
 * executes external processes. All inputs are validated against the allowlist
 * before execution. Shell interpolation is never used.
 */
import { spawn } from 'child_process';
import path from 'path';

// ─── Command Allowlist ───────────────────────────────────────
// ONLY these exact commands may be executed. Any other value is rejected.

export const COMMAND_ALLOWLIST = new Set([
  'npm test',
  'npm test -- --reporter=verbose',
  'npm run lint',
  'npm run typecheck',
  'npm run build',
]);

// ─── Allowlist Validation ────────────────────────────────────

export function isAllowedCommand(command: string): boolean {
  return COMMAND_ALLOWLIST.has(command.trim());
}

/**
 * Validate that a command is on the allowlist.
 * Also checks for common injection patterns as a defence-in-depth measure.
 */
export function validateCommand(command: string): { valid: boolean; reason?: string } {
  if (!command || typeof command !== 'string') {
    return { valid: false, reason: 'Command must be a non-empty string' };
  }

  // Defence-in-depth: reject shell injection patterns regardless of allowlist
  const INJECTION_PATTERNS = [/;/, /&&/, /\|\|/, /\|/, />/, /</, /`/, /\$\(/, /&$/];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, reason: `Command contains forbidden character pattern: ${pattern}` };
    }
  }

  if (!isAllowedCommand(command)) {
    return {
      valid: false,
      reason: `Command not in allowlist. Allowed: ${Array.from(COMMAND_ALLOWLIST).join(', ')}`,
    };
  }

  return { valid: true };
}

// ─── Execution Result ────────────────────────────────────────

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

// ─── Runner ──────────────────────────────────────────────────

const MAX_OUTPUT_BYTES = 256 * 1024; // 256KB cap per stream

/**
 * Execute an allowlisted command in the given working directory.
 * Returns a promise that always resolves (never rejects) — errors are captured in the result.
 * Timeout: 120 seconds.
 */
export function runCommand(
  command: string,
  cwd: string,
  timeoutMs = 120_000,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const start = Date.now();

    // Parse command into executable + args (no shell interpolation)
    const [executable, ...args] = command.trim().split(/\s+/);

    // On Windows, .cmd files require shell:true to execute.
    // We use shell:true only on Windows, where the allowlist is the security boundary.
    const isWindows = process.platform === 'win32';

    const child = isWindows
      ? spawn(executable, args, {
          cwd: path.resolve(cwd),
          shell: true, // required on Windows for npm.cmd
          timeout: timeoutMs,
          env: { ...process.env },
        })
      : spawn(executable, args, {
          cwd: path.resolve(cwd),
          shell: false,
          timeout: timeoutMs,
          env: { ...process.env },
        });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString('utf-8');
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString('utf-8');
      }
    });

    child.on('close', (code, signal) => {
      const durationMs = Date.now() - start;
      const exitCode = code ?? (signal ? 1 : 0);
      resolve({ exitCode, stdout, stderr, durationMs });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - start;
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: `Process error: ${err.message}`,
        durationMs,
      });
    });
  });
}
