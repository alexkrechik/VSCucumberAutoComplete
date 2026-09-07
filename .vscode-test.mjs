import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const extensionRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureWorkspace = path.join(
  extensionRoot,
  'gclient',
  'test',
  'fixtures',
  'workspace'
);
const testRunRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vscac-e2e-'));
const testWorkspace = path.join(testRunRoot, 'workspace');
const workspaceUserData = path.join(testRunRoot, 'workspace-user-data');
const standaloneUserData = path.join(testRunRoot, 'standalone-user-data');

fs.cpSync(fixtureWorkspace, testWorkspace, { recursive: true });
process.on('exit', () => {
  fs.rmSync(testRunRoot, { recursive: true, force: true });
});

const sharedTestOptions = {
  version: process.env.VSCODE_TEST_VERSION || 'stable',
  extensionDevelopmentPath: extensionRoot,
  srcDir: extensionRoot,
  mocha: {
    failZero: true,
    timeout: 60_000,
  },
};

const sharedLaunchArgs = ['--disable-extensions', '--disable-workspace-trust'];

export default defineConfig({
  tests: [
    {
      ...sharedTestOptions,
      label: 'workspace',
      files: '.vscode-test/out/extension.test.js',
      workspaceFolder: testWorkspace,
      launchArgs: [
        ...sharedLaunchArgs,
        `--user-data-dir=${workspaceUserData}`,
      ],
    },
    {
      ...sharedTestOptions,
      label: 'standalone',
      files: '.vscode-test/out/standalone.test.js',
      launchArgs: [
        ...sharedLaunchArgs,
        `--user-data-dir=${standaloneUserData}`,
      ],
    },
  ],
  coverage: {
    include: ['**/gserver/out/server.js'],
    includeAll: true,
    reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
  },
});
