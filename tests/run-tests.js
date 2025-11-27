#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const tests = [];

// Minimal global test registration helper.
global.test = (name, fn) => {
  if (typeof name !== 'string' || typeof fn !== 'function') {
    throw new Error('test() expects a name and function');
  }
  tests.push({ name, fn });
};

async function loadTests(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadTests(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      require(fullPath);
    }
  }
}

async function run() {
  await loadTests(__dirname);
  if (!tests.length) {
    console.log('No tests found.');
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(error?.stack || error);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
