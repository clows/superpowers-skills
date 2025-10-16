#!/usr/bin/env node

/**
 * Bisection script to find which test creates unwanted files/state
 * Usage: ./find-polluter.js <file_or_dir_to_check> <test_pattern>
 * Example: ./find-polluter.js '.git' 'src/**\/*.test.ts'
 */

import { glob } from 'glob';
import { spawn } from 'child_process';
import fs from 'fs';

function runTest(testFile) {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['test', testFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', () => {
      resolve({ code: 1, stdout, stderr });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('Usage: find-polluter.js <file_to_check> <test_pattern>');
    console.log('Example: find-polluter.js \'.git\' \'src/**/*.test.ts\'');
    process.exit(1);
  }

  const pollutionCheck = args[0];
  const testPattern = args[1];

  console.log(`🔍 Searching for test that creates: ${pollutionCheck}`);
  console.log(`Test pattern: ${testPattern}`);
  console.log('');

  // Get list of test files
  const testFiles = await glob(testPattern, {
    cwd: process.cwd(),
    absolute: false
  });

  const total = testFiles.length;
  console.log(`Found ${total} test files`);
  console.log('');

  let count = 0;
  for (const testFile of testFiles) {
    count++;

    // Skip if pollution already exists
    if (fs.existsSync(pollutionCheck)) {
      console.log(`⚠️  Pollution already exists before test ${count}/${total}`);
      console.log(`   Skipping: ${testFile}`);
      continue;
    }

    console.log(`[${count}/${total}] Testing: ${testFile}`);

    // Run the test
    await runTest(testFile);

    // Check if pollution appeared
    if (fs.existsSync(pollutionCheck)) {
      console.log('');
      console.log('🎯 FOUND POLLUTER!');
      console.log(`   Test: ${testFile}`);
      console.log(`   Created: ${pollutionCheck}`);
      console.log('');
      console.log('Pollution details:');

      // Show pollution details
      try {
        const stats = fs.statSync(pollutionCheck);
        if (stats.isDirectory()) {
          console.log(`   Directory: ${pollutionCheck}`);
          const files = fs.readdirSync(pollutionCheck);
          console.log(`   Contains ${files.length} items`);
        } else {
          console.log(`   File: ${pollutionCheck} (${stats.size} bytes)`);
        }
      } catch (err) {
        console.log(`   ${pollutionCheck}`);
      }

      console.log('');
      console.log('To investigate:');
      console.log(`  npm test ${testFile}    # Run just this test`);
      console.log(`  cat ${testFile}         # Review test code`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('✅ No polluter found - all tests clean!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
