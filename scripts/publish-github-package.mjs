import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const githubRegistry = 'https://npm.pkg.github.com';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const packageAliases = {
  '@elucim/core': '@sethjuarez/elucim-core',
  '@elucim/dsl': '@sethjuarez/elucim-dsl',
  '@elucim/editor': '@sethjuarez/elucim-editor',
  '@elucim/cli': '@sethjuarez/elucim-cli',
};

const [, , sourcePackageName, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

if (!sourcePackageName || !packageAliases[sourcePackageName]) {
  throw new Error(`Usage: node scripts/publish-github-package.mjs ${Object.keys(packageAliases).join('|')}`);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = packageDirectoryFor(sourcePackageName);
const packageJsonPath = resolve(repoRoot, packageDirectory, 'package.json');
const sourcePackageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const targetPackageName = packageAliases[sourcePackageName];
const version = sourcePackageJson.version;

if (!dryRun && isAlreadyPublished(targetPackageName, version)) {
  console.log(`${targetPackageName}@${version} already exists in GitHub Packages; skipping.`);
  process.exit(0);
}

const tempRoot = await mkdtemp(join(tmpdir(), 'elucim-github-package-'));

try {
  const packDestination = join(tempRoot, 'packed');
  await mkdir(packDestination, { recursive: true });
  run(pnpm, ['--filter', sourcePackageName, 'pack', '--pack-destination', packDestination], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const tarball = join(packDestination, packageTarballName(sourcePackageJson));
  if (!existsSync(tarball)) {
    throw new Error(`Expected packed artifact ${tarball} for ${sourcePackageName}`);
  }

  const extractDestination = join(tempRoot, 'extract');
  await mkdir(extractDestination, { recursive: true });
  run('tar', ['-xzf', tarball, '-C', extractDestination], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const stagedPackageRoot = join(extractDestination, 'package');
  const stagedPackageJsonPath = join(stagedPackageRoot, 'package.json');
  const stagedPackageJson = JSON.parse(await readFile(stagedPackageJsonPath, 'utf8'));
  stagedPackageJson.name = targetPackageName;
  stagedPackageJson.publishConfig = {
    registry: githubRegistry,
  };
  rewriteOwnedDependencies(stagedPackageJson, version);
  await writeFile(stagedPackageJsonPath, `${JSON.stringify(stagedPackageJson, null, 2)}\n`);

  if (dryRun) {
    run(npm, ['pack', '--dry-run'], {
      cwd: stagedPackageRoot,
      stdio: 'inherit',
    });
    console.log(`Dry run prepared ${targetPackageName}@${version} for GitHub Packages.`);
    process.exit(0);
  }

  run(npm, ['publish', '--registry', githubRegistry, '--ignore-scripts'], {
    cwd: stagedPackageRoot,
    stdio: 'inherit',
  });
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function packageDirectoryFor(packageName) {
  const unscopedName = packageName.replace('@elucim/', '');
  return `packages/${unscopedName}`;
}

function packageTarballName(packageJson) {
  const packageFileName = packageJson.name.replace(/^@/, '').replaceAll('/', '-');
  return `${packageFileName}-${packageJson.version}.tgz`;
}

function isAlreadyPublished(packageName, version) {
  try {
    const output = run(npm, ['view', `${packageName}@${version}`, 'version', '--registry', githubRegistry], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return output.trim() === version;
  } catch (error) {
    const errorOutput = `${error.stderr?.toString() ?? ''}\n${error.stdout?.toString() ?? ''}`;
    if (errorOutput.includes('E404') || errorOutput.includes('404 Not Found')) {
      return false;
    }

    throw new Error(`Unable to check ${packageName}@${version} in GitHub Packages:\n${errorOutput}`);
  }
}

function rewriteOwnedDependencies(packageJson, version) {
  for (const dependencyField of ['dependencies', 'optionalDependencies']) {
    const dependencies = packageJson[dependencyField];
    if (!dependencies) continue;

    for (const [sourceName, targetName] of Object.entries(packageAliases)) {
      if (dependencies[sourceName]) {
        dependencies[sourceName] = toAliasDependency(targetName, dependencies[sourceName]);
      }
    }
  }
}

function toAliasDependency(targetName, sourceSpec) {
  const aliasPrefix = 'npm:';
  if (sourceSpec.startsWith(aliasPrefix)) {
    const aliasSpec = sourceSpec.slice(aliasPrefix.length);
    const versionStart = aliasSpec.startsWith('@') ? aliasSpec.indexOf('@', 1) : aliasSpec.indexOf('@');
    if (versionStart === -1) {
      throw new Error(`Unable to preserve aliased dependency version from ${sourceSpec}`);
    }
    return `${aliasPrefix}${targetName}@${aliasSpec.slice(versionStart + 1)}`;
  }

  return `${aliasPrefix}${targetName}@${sourceSpec}`;
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
