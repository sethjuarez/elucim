import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(import.meta.dirname, '..');
const version = process.argv[2];
const pubkey = process.env.TAURI_UPDATER_PUBKEY;

if (!version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Expected a semver release version argument, got "${version ?? ''}".`);
}

if (!pubkey) {
  throw new Error('TAURI_UPDATER_PUBKEY must be set to build signed updater artifacts.');
}

const packageJsonPath = resolve(appRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const tauriConfigPath = resolve(appRoot, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf8'));
tauriConfig.version = version;
tauriConfig.plugins ??= {};
tauriConfig.plugins.updater ??= {};
tauriConfig.plugins.updater.pubkey = pubkey;
writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);

const cargoPath = resolve(appRoot, 'src-tauri', 'Cargo.toml');
const cargoToml = readFileSync(cargoPath, 'utf8').replace(
  /^version = ".+"$/m,
  `version = "${version}"`,
);
writeFileSync(cargoPath, cargoToml);
