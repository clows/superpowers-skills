#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';
import { fileURLToPath } from 'url';

// Get the directory where this script lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOOK_DIR = path.join(os.homedir(), '.claude', 'hooks');
const HOOK_FILE = path.join(HOOK_DIR, 'sessionEnd');
const SOURCE_HOOK = path.join(__dirname, 'hooks', 'sessionEnd');

const HOOK_CONTENT = `#!/usr/bin/env node

// Auto-index conversations (remembering-conversations skill)
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const INDEXER = path.join(os.homedir(), '.claude', 'skills', 'collaboration', 'remembering-conversations', 'tool', 'index-conversations');

if (process.env.SESSION_ID && require('fs').existsSync(INDEXER)) {
  const proc = spawn(INDEXER, ['--session', process.env.SESSION_ID], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
}
`;

async function main() {
  console.log('Installing conversation indexing hook...');

  // Create hooks directory
  if (!fs.existsSync(HOOK_DIR)) {
    fs.mkdirSync(HOOK_DIR, { recursive: true });
  }

  // Handle existing hook
  if (fs.existsSync(HOOK_FILE)) {
    console.log('⚠️  Existing sessionEnd hook found');

    // Check if our indexer is already installed
    const existingContent = fs.readFileSync(HOOK_FILE, 'utf8');
    if (existingContent.includes('remembering-conversations') && existingContent.includes('index-conversations')) {
      console.log('✓ Indexer already installed in existing hook');
      process.exit(0);
    }

    // Create backup
    const backup = `${HOOK_FILE}.backup.${Date.now()}`;
    fs.copyFileSync(HOOK_FILE, backup);
    console.log(`Created backup: ${backup}`);

    // Offer merge or replace
    console.log('');
    console.log('Options:');
    console.log('  (m) Merge - Add indexer to existing hook');
    console.log('  (r) Replace - Overwrite with our hook');
    console.log('  (c) Cancel - Exit without changes');
    console.log('');

    const response = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Choose an option:',
      choices: [
        { title: 'Merge', value: 'm' },
        { title: 'Replace', value: 'r' },
        { title: 'Cancel', value: 'c' }
      ],
      initial: 0
    });

    const choice = response.choice;

    if (choice === 'm') {
      // Append our indexer
      const appendContent = `\n# Auto-index conversations (remembering-conversations skill)\nINDEXER="$HOME/.claude/skills/collaboration/remembering-conversations/tool/index-conversations"\nif [ -n "$SESSION_ID" ] && [ -x "$INDEXER" ]; then\n  "$INDEXER" --session "$SESSION_ID" > /dev/null 2>&1 &\nfi\n`;
      fs.appendFileSync(HOOK_FILE, appendContent, 'utf8');
      console.log('✓ Merged indexer into existing hook');
    } else if (choice === 'r') {
      fs.writeFileSync(HOOK_FILE, HOOK_CONTENT, 'utf8');
      fs.chmodSync(HOOK_FILE, 0o755);
      console.log('✓ Replaced hook with our version');
    } else {
      console.log('Installation cancelled');
      process.exit(1);
    }
  } else {
    // No existing hook, install fresh
    fs.writeFileSync(HOOK_FILE, HOOK_CONTENT, 'utf8');
    fs.chmodSync(HOOK_FILE, 0o755);
    console.log('✓ Installed sessionEnd hook');
  }

  // Verify executable (Unix only)
  if (process.platform !== 'win32') {
    try {
      fs.accessSync(HOOK_FILE, fs.constants.X_OK);
    } catch (err) {
      fs.chmodSync(HOOK_FILE, 0o755);
    }
  }

  console.log('');
  console.log('Hook installed successfully!');
  console.log(`Location: ${HOOK_FILE}`);
  console.log('');
  console.log('Test it:');
  console.log(`  SESSION_ID=test-$(date +%s) ${HOOK_FILE}` + '`');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
