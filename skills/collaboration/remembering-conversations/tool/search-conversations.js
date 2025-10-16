#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory where this script lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HELP_TEXT = `search-conversations - Search previous Claude Code conversations

USAGE:
  search-conversations [OPTIONS] <query>

MODES:
  (default)      Vector similarity search (semantic)
  --text         Exact string matching (for git SHAs, error codes)
  --both         Combine vector + text search

OPTIONS:
  --after DATE   Only conversations after YYYY-MM-DD
  --before DATE  Only conversations before YYYY-MM-DD
  --limit N      Max results (default: 10)
  --help, -h     Show this help

EXAMPLES:
  # Semantic search
  search-conversations "React Router authentication errors"

  # Find exact string (git SHA, error message)
  search-conversations --text "a1b2c3d4e5f6"

  # Time filtering
  search-conversations --after 2025-09-01 "refactoring"
  search-conversations --before 2025-10-01 --limit 20 "bug fix"

  # Combine modes
  search-conversations --both "React Router data loading"

OUTPUT FORMAT:
  For each result:
  - Project name and date
  - Conversation summary (AI-generated)
  - Matched exchange with similarity % (vector mode)
  - File path with line numbers

  Example:
  1. [react-router-7-starter, 2025-09-17]
     Built authentication with JWT, implemented protected routes.

     92% match: "How do I handle auth errors in loaders?"
     ~/.config/superpowers/conversation-archive/.../uuid.jsonl:145-167

QUERY TIPS:
  - Use natural language: "How did we handle X?"
  - Be specific: "React Router data loading" not "routing"
  - Include context: "TypeScript type narrowing in guards"

SEE ALSO:
  skills/collaboration/remembering-conversations/INDEXING.md - Manage index
  skills/collaboration/remembering-conversations/SKILL.md - Usage guide`;

function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Parse arguments
  let mode = 'vector';
  let after = '';
  let before = '';
  let limit = '10';
  const queryParts = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--text') {
      mode = 'text';
    } else if (arg === '--both') {
      mode = 'both';
    } else if (arg === '--after') {
      after = args[++i] || '';
    } else if (arg === '--before') {
      before = args[++i] || '';
    } else if (arg === '--limit') {
      limit = args[++i] || '10';
    } else {
      queryParts.push(arg);
    }
  }

  const query = queryParts.join(' ').trim();

  if (!query) {
    console.log('Usage: search-conversations [options] <query>');
    console.log('Try: search-conversations --help');
    process.exit(1);
  }

  // Execute with npx tsx
  const tsxArgs = [
    'tsx',
    path.join(__dirname, 'src', 'search-cli.ts'),
    query,
    mode,
    limit,
    after,
    before
  ];

  const proc = spawn('npx', tsxArgs, {
    stdio: 'inherit',
    cwd: __dirname,
    shell: process.platform === 'win32'
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });

  proc.on('error', (err) => {
    console.error(`Error executing search-conversations: ${err.message}`);
    process.exit(1);
  });
}

main();
