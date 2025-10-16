#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory where this script lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_DIR = __dirname;

const HELP_TEXT = `index-conversations - Index and manage conversation archives

USAGE:
  index-conversations [COMMAND] [OPTIONS]

COMMANDS:
  (default)      Index all conversations
  --cleanup      Process only unindexed conversations (fast, cheap)
  --session ID   Index specific session (used by hook)
  --verify       Check index health
  --repair       Fix detected issues
  --rebuild      Delete DB and re-index everything (requires confirmation)

OPTIONS:
  --concurrency N    Parallel summarization (1-16, default: 1)
  -c N               Short form of --concurrency
  --no-summaries     Skip AI summary generation (free, but no summaries in results)
  --help, -h         Show this help

EXAMPLES:
  # Index all unprocessed (recommended for backfill)
  index-conversations --cleanup

  # Index with 8 parallel summarizations (8x faster)
  index-conversations --cleanup --concurrency 8

  # Index without AI summaries (free, fast)
  index-conversations --cleanup --no-summaries

  # Check index health
  index-conversations --verify

  # Fix any issues found
  index-conversations --repair

  # Nuclear option (deletes everything, re-indexes)
  index-conversations --rebuild

WORKFLOW:
  1. Initial setup: index-conversations --cleanup
  2. Ongoing: Auto-indexed by sessionEnd hook
  3. Health check: index-conversations --verify (weekly)
  4. Recovery: index-conversations --repair (if issues found)

SEE ALSO:
  INDEXING.md - Setup and maintenance guide
  DEPLOYMENT.md - Production runbook`;

function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Determine subcommand
  let subcommand = 'index-all';
  const firstArg = args[0];

  if (firstArg === '--session') {
    subcommand = 'index-session';
  } else if (firstArg === '--cleanup') {
    subcommand = 'index-cleanup';
  } else if (firstArg === '--verify') {
    subcommand = 'verify';
  } else if (firstArg === '--repair') {
    subcommand = 'repair';
  } else if (firstArg === '--rebuild') {
    subcommand = 'rebuild';
  }

  // Special handling for rebuild (confirmation)
  if (subcommand === 'rebuild') {
    console.log('⚠️  This will DELETE the entire database and re-index everything.');
    console.log('Are you sure? [yes/NO]: ');

    // For non-interactive mode, skip confirmation
    // In a real implementation, you'd use prompts or readline
    console.log('Cancelled (use interactive mode for rebuild)');
    process.exit(1);
  }

  // Execute with npx tsx
  const tsxArgs = [
    'tsx',
    path.join(SCRIPT_DIR, 'src', 'index-cli.ts'),
    subcommand,
    ...args
  ];

  const proc = spawn('npx', tsxArgs, {
    stdio: 'inherit',
    cwd: SCRIPT_DIR,
    shell: process.platform === 'win32'
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });

  proc.on('error', (err) => {
    console.error(`Error executing index-conversations: ${err.message}`);
    process.exit(1);
  });
}

main();
