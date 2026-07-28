#!/usr/bin/env node
/**
 * Validate a workflow YAML file parses as a single YAML document.
 * Replaces broken `npm exec -- yaml <file>` (yaml CLI expects stdin, not a path arg).
 */
import fs from 'node:fs';
import process from 'node:process';
import { parse } from 'yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: node tools/ci/validate-workflow-yaml.mjs <yaml-file>');
  process.exit(2);
}
const text = fs.readFileSync(target, 'utf8');
parse(text);
console.log(`yaml_ok ${target}`);
