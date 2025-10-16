#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get the directory where this script lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine directories
const SKILLS_DIR = path.resolve(__dirname, '..', '..');

// Get superpowers directory
function getSuperpowersDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'superpowers');
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'superpowers');
  }

  return path.join(os.homedir(), '.config', 'superpowers');
}

const SUPERPOWERS_DIR = getSuperpowersDir();
const LOG_FILE = path.join(SUPERPOWERS_DIR, 'search-log.jsonl');

/**
 * Show help
 */
function showHelp() {
  console.log(`find-skills - Find and list skills with when_to_use guidance

USAGE:
  find-skills              Show all skills with when_to_use guidance
  find-skills PATTERN      Filter skills by grep pattern
  find-skills --help       Show this help

EXAMPLES:
  find-skills                        # All skills
  find-skills test                   # Skills matching "test"
  find-skills 'test.*driven|TDD'     # Regex pattern

OUTPUT:
  Each line shows: Use skill-path/SKILL.md when [trigger]
  Paths include /SKILL.md for direct use with Read tool

SEARCH:
  Searches both skill content AND path names.
  Skills location: ~/.config/superpowers/skills/`);
}

/**
 * Extract when_to_use from SKILL.md
 */
function getWhenToUse(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('when_to_use:')) {
        return line.replace(/^when_to_use:\s*/, '').trim();
      }
    }
  } catch (err) {
    // Ignore errors
  }
  return '';
}

/**
 * Get relative skill path (includes /SKILL.md)
 */
function getSkillPath(filePath, baseDir) {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
}

/**
 * Log search query
 */
function logSearch(query) {
  try {
    // Ensure directory exists
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, query }) + '\n';
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
  } catch (err) {
    // Ignore logging errors
  }
}

/**
 * Search file content for pattern
 */
function fileMatchesPattern(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(pattern, 'i');
    return regex.test(content);
  } catch (err) {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Get pattern (optional)
  const pattern = args[0] || '';

  // Find all SKILL.md files
  const allFiles = await glob('**/SKILL.md', {
    cwd: SKILLS_DIR,
    absolute: true,
    ignore: ['**/node_modules/**']
  });

  // Filter by pattern if provided
  let matchingFiles = allFiles;

  if (pattern) {
    // Log the search
    logSearch(pattern);

    matchingFiles = allFiles.filter(file => {
      // Check if pattern matches file path
      const relativePath = getSkillPath(file, SKILLS_DIR);
      const regex = new RegExp(pattern, 'i');
      if (regex.test(relativePath)) {
        return true;
      }

      // Check if pattern matches file content
      return fileMatchesPattern(file, pattern);
    });
  }

  // Check if we found anything
  if (matchingFiles.length === 0) {
    if (pattern) {
      console.log(`❌ No skills found matching: ${pattern}`);
      console.log('');
      console.log('Search logged. If a skill should exist, consider writing it!');
    } else {
      console.log('❌ No skills found');
    }
    process.exit(0);
  }

  // Collect results
  const results = matchingFiles.map(file => {
    const skillPath = getSkillPath(file, SKILLS_DIR);
    const whenToUse = getWhenToUse(file);
    return { skillPath, whenToUse };
  });

  // Sort and display results
  results.sort((a, b) => a.skillPath.localeCompare(b.skillPath));

  for (const { skillPath, whenToUse } of results) {
    if (whenToUse) {
      console.log(`Use ${skillPath} ${whenToUse}`);
    } else {
      console.log(skillPath);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
