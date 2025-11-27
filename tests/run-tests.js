"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const testsRoot = path.resolve(__dirname);

function findTests(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTests(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function runTestFile(filePath) {
  console.log(`\n▶ Running ${path.relative(process.cwd(), filePath)}`);
  const result = spawnSync(process.execPath, [filePath], { stdio: "inherit" });

  if (result.error) {
    console.error(result.error);
    return 1;
  }
  if (result.status !== null && result.status !== undefined) {
    return result.status;
  }
  return result.signal ? 1 : 0;
}

const testFiles = findTests(testsRoot);

if (!testFiles.length) {
  console.log("No tests found in tests/.");
  process.exit(0);
}

let exitCode = 0;
for (const filePath of testFiles) {
  const resultCode = runTestFile(filePath);
  if (resultCode !== 0) {
    exitCode = resultCode;
    break;
  }
}

process.exit(exitCode);
