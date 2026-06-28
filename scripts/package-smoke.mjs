import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packages = [
  { name: '@elucim/core', directory: 'packages/core' },
  { name: '@elucim/dsl', directory: 'packages/dsl' },
  { name: '@elucim/editor', directory: 'packages/editor' },
  { name: '@elucim/cli', directory: 'packages/cli' },
];

const tempRoot = await mkdtemp(join(tmpdir(), 'elucim-package-smoke-'));

try {
  const packedDir = join(tempRoot, 'packed');
  const consumerDir = join(tempRoot, 'consumer');
  await mkdir(packedDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

  const tarballs = new Map();
  for (const packageInfo of packages) {
    const packageJson = await readPackageJson(packageInfo.directory);
    ensureBuiltEntryPoints(packageInfo.directory, packageJson);
    run(pnpm, ['--filter', packageInfo.name, 'pack', '--pack-destination', packedDir], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    const tarball = join(packedDir, packageTarballName(packageJson));
    if (!existsSync(tarball)) {
      throw new Error(`Expected packed artifact ${tarball} for ${packageInfo.name}`);
    }
    tarballs.set(packageInfo.name, tarball);
  }

  await writeFile(
    join(consumerDir, 'package.json'),
    `${JSON.stringify({
      name: 'elucim-packed-artifact-smoke',
      private: true,
      type: 'module',
      dependencies: {
        '@elucim/core': fileDependency(consumerDir, tarballs.get('@elucim/core')),
        '@elucim/dsl': fileDependency(consumerDir, tarballs.get('@elucim/dsl')),
        '@elucim/editor': fileDependency(consumerDir, tarballs.get('@elucim/editor')),
        '@elucim/cli': fileDependency(consumerDir, tarballs.get('@elucim/cli')),
        jsdom: '^28.1.0',
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      },
    }, null, 2)}\n`,
  );

  run(npm, ['install', '--package-lock=false', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'], {
    cwd: consumerDir,
    stdio: 'inherit',
  });

  const smokeFile = join(consumerDir, 'smoke.mjs');
  await writeFile(smokeFile, smokeSource());
  execFileSync(process.execPath, [smokeFile], { cwd: consumerDir, stdio: 'inherit' });
  console.log('Packed package smoke tests passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function run(command, args, options) {
  if (process.platform === 'win32') {
    return execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')], {
      ...options,
      windowsHide: true,
    });
  }
  return execFileSync(command, args, {
    ...options,
    windowsHide: true,
  });
}

function quoteWindowsArg(value) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

async function readPackageJson(packageDirectory) {
  return JSON.parse(await readFile(resolve(repoRoot, packageDirectory, 'package.json'), 'utf8'));
}

function ensureBuiltEntryPoints(packageDirectory, packageJson) {
  const packageRoot = resolve(repoRoot, packageDirectory);
  for (const target of collectExportTargets(packageJson.exports)) {
    const filePath = resolve(packageRoot, target);
    if (!existsSync(filePath)) {
      throw new Error(`${packageJson.name} export target is missing: ${target}. Run pnpm build before pnpm test:package-smoke.`);
    }
  }
  if (packageJson.bin) {
    const binTargets = typeof packageJson.bin === 'string' ? [packageJson.bin] : Object.values(packageJson.bin);
    for (const target of binTargets) {
      const filePath = resolve(packageRoot, target);
      if (!existsSync(filePath)) {
        throw new Error(`${packageJson.name} bin target is missing: ${target}. Run pnpm build before pnpm test:package-smoke.`);
      }
    }
  }
}

function collectExportTargets(exportsValue) {
  if (!exportsValue) return [];
  if (typeof exportsValue === 'string') return [exportsValue];
  if (Array.isArray(exportsValue)) return exportsValue.flatMap(collectExportTargets);
  if (typeof exportsValue === 'object') {
    return Object.values(exportsValue).flatMap(collectExportTargets);
  }
  return [];
}

function packageTarballName(packageJson) {
  const packageFileName = packageJson.name.replace(/^@/, '').replaceAll('/', '-');
  return `${packageFileName}-${packageJson.version}.tgz`;
}

function fileDependency(consumerDir, tarball) {
  return `file:${relative(consumerDir, tarball).replaceAll('\\', '/')}`;
}

function smokeSource() {
  return `import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import React from 'react';
import { Circle, Player, interpolate } from '@elucim/core';
import { normalizeDocument, renderToSvgString, validateDocument } from '@elucim/dsl';
import { createAgentSafeDocument, createCalculusDerivativeScenePreset } from '@elucim/dsl/agent';

const consumerDir = dirname(fileURLToPath(import.meta.url));
const cliEntry = join(consumerDir, 'node_modules', '@elucim', 'cli', 'dist', 'index.js');
assert.equal(Boolean(Player), true, '@elucim/core Player export should import');
assert.equal(Boolean(Circle), true, '@elucim/core Circle export should import');
assert.equal(interpolate(5, [0, 10], [0, 100]), 50, '@elucim/core interpolate should run');

const document = {
  version: '2.0',
  scene: {
    type: 'player',
    width: 640,
    height: 360,
    children: ['title'],
  },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      role: 'title',
      props: { type: 'text', content: 'Smoke test', x: 320, y: 80, fill: '$title', fontSize: 32 },
    },
  },
};
const validation = validateDocument(document);
assert.equal(validation.valid, true, validation.errors.map(error => error.message).join('\\n'));
assert.equal(normalizeDocument(document).document.scene.children[0], 'title', '@elucim/dsl normalizeDocument should run');
const calculusDoc = createAgentSafeDocument(createCalculusDerivativeScenePreset({ id: 'derivative' }));
assert.equal(validateDocument(calculusDoc).valid, true, '@elucim/dsl calculus agent preset should validate');
assert.equal(renderToSvgString(calculusDoc, 0).includes('elucim-tangent-line'), true, '@elucim/dsl calculus agent preset should render');

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const editor = await import('@elucim/editor');
assert.equal(typeof editor.ElucimEditor, 'function', '@elucim/editor ElucimEditor export should import');
assert.equal(editor.createDefaultDocument().root.type, 'player', '@elucim/editor createDefaultDocument should run');
assert.equal(React.isValidElement(React.createElement(editor.ElucimEditor, {})), true, '@elucim/editor component should be usable with React');

assert.equal(existsSync(cliEntry), true, '@elucim/cli dist entry should exist');
const opsOutput = execFileSync(process.execPath, [cliEntry, 'ops', '--json'], { encoding: 'utf8' });
const ops = JSON.parse(opsOutput);
assert.equal(Array.isArray(ops.cli?.commands), true, '@elucim/cli ops should return command catalog JSON');
assert.equal(ops.cli.commands.some(command => command.name === 'validate'), true, '@elucim/cli command catalog should include validate');
`;
}
