#!/usr/bin/env node

/**
 * Master gardening script for skills wiki maintenance
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSkillsDir() {
  const args = process.argv.slice(2);
  if (args[0]) {
    return args[0];
  }

  // Default to user's skills directory
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'superpowers', 'skills');
  }

  return path.join(os.homedir(), '.config', 'superpowers', 'skills');
}

function runScript(scriptName, skillsDir) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, scriptName);

    const proc = spawn('node', [scriptPath, skillsDir], {
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      resolve(code);
    });

    proc.on('error', (err) => {
      console.error(`Error running ${scriptName}:`, err.message);
      resolve(1);
    });
  });
}

async function main() {
  const skillsDir = getSkillsDir();

  console.log('=== Skills Wiki Health Check ===');
  console.log('');

  // Make scripts executable if needed (Unix only)
  if (process.platform !== 'win32') {
    try {
      const scripts = ['check-naming.js', 'check-links.js', 'check-index-coverage.js'];
      for (const script of scripts) {
        const scriptPath = path.join(__dirname, script);
        if (fs.existsSync(scriptPath)) {
          fs.chmodSync(scriptPath, 0o755);
        }
      }
    } catch (err) {
      // Ignore chmod errors
    }
  }

  // Run all checks
  await runScript('check-naming.js', skillsDir);
  console.log('');

  await runScript('check-links.js', skillsDir);
  console.log('');

  await runScript('check-index-coverage.js', skillsDir);

  console.log('');
  console.log('=== Health Check Complete ===');
  console.log('');
  console.log('Fix: ❌ errors (broken/missing) | Consider: ⚠️  warnings | ✅ = correct');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
