#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory where this script lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine skills root
const SKILLS_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Show usage
 */
function showUsage() {
  console.log(`Usage: scripts/skill-run <skill-relative-path> [args...]

Runs scripts from skills directory.

Examples:
  scripts/skill-run skills/collaboration/remembering-conversations/tool/search-conversations "query"
  scripts/skill-run skills/collaboration/remembering-conversations/tool/index-conversations --cleanup

The script will be found at:
  \${SUPERPOWERS_SKILLS_ROOT}/<skill-relative-path>`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  // Get the script path to run
  const scriptPath = args[0];
  const scriptArgs = args.slice(1);

  // Resolve the full path
  const scriptFullPath = path.join(SKILLS_ROOT, scriptPath);

  // Check if script exists
  if (!fs.existsSync(scriptFullPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    console.error('');
    console.error('Searched:');
    console.error(`  ${scriptFullPath}`);
    process.exit(1);
  }

  // Check if script is executable (on Unix) or if it's a known script type
  const ext = path.extname(scriptFullPath);
  let command = scriptFullPath;
  let execArgs = scriptArgs;

  // Determine how to execute the script based on extension
  if (ext === '.js' || ext === '.mjs') {
    command = 'node';
    execArgs = [scriptFullPath, ...scriptArgs];
  } else if (ext === '.sh' || ext === '.bash') {
    if (process.platform === 'win32') {
      // On Windows, try to run with Git Bash if available
      command = 'bash';
      execArgs = [scriptFullPath, ...scriptArgs];
    } else {
      // On Unix, execute directly
      try {
        fs.accessSync(scriptFullPath, fs.constants.X_OK);
      } catch (err) {
        // Not executable, try with bash
        command = 'bash';
        execArgs = [scriptFullPath, ...scriptArgs];
      }
    }
  } else if (ext === '') {
    // No extension - try to execute directly on Unix, or check if it's a bash script
    if (process.platform === 'win32') {
      // On Windows, read the shebang to determine interpreter
      try {
        const content = fs.readFileSync(scriptFullPath, 'utf8');
        if (content.startsWith('#!')) {
          const shebang = content.split('\n')[0];
          if (shebang.includes('node')) {
            command = 'node';
            execArgs = [scriptFullPath, ...scriptArgs];
          } else if (shebang.includes('bash') || shebang.includes('sh')) {
            command = 'bash';
            execArgs = [scriptFullPath, ...scriptArgs];
          }
        }
      } catch (err) {
        // Can't read file, try to execute anyway
      }
    } else {
      // On Unix, try to execute directly
      try {
        fs.accessSync(scriptFullPath, fs.constants.X_OK);
      } catch (err) {
        console.error(`Error: Script is not executable: ${scriptPath}`);
        console.error('Try: chmod +x ${scriptFullPath}');
        process.exit(1);
      }
    }
  }

  // Execute the script
  const proc = spawn(command, execArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });

  proc.on('error', (err) => {
    console.error(`Error executing script: ${err.message}`);
    process.exit(1);
  });
}

main();
