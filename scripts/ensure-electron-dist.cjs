'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist-electron');
const distPkgPath = path.join(distRoot, 'package.json');

const requiredOutputs = [
  path.join(distRoot, 'src', 'main', 'main.js'),
  path.join(distRoot, 'src', 'main', 'preload.js'),
  path.join(distRoot, 'src', 'shared', 'constants.js'),
  path.join(distRoot, 'src', 'shared', 'errors.js'),
  path.join(distRoot, 'src', 'shared', 'types.js')
];

const trackedSources = [
  path.join(projectRoot, 'src', 'main'),
  path.join(projectRoot, 'src', 'shared')
];

const banner = (msg) => {
  console.log(`\n[ensure-electron-dist] ${msg}`);
};

const ensureDistPackage = () => {
  if (fs.existsSync(distPkgPath)) {
    return;
  }

  banner('Missing dist-electron/package.json — recreating with CommonJS type');
  fs.mkdirSync(distRoot, { recursive: true });
  fs.writeFileSync(
    distPkgPath,
    JSON.stringify({ type: 'commonjs' }, null, 2) + '\n',
    'utf8'
  );
};

const newestMtime = (entries) => {
  let newest = 0;
  for (const entry of entries) {
    if (!fs.existsSync(entry)) {
      return 0;
    }

    const stats = fs.statSync(entry);
    if (stats.isDirectory()) {
      const childNames = fs.readdirSync(entry).map((child) => path.join(entry, child));
      const childNewest = newestMtime(childNames);
      newest = Math.max(newest, childNewest);
    } else {
      newest = Math.max(newest, stats.mtimeMs);
    }
  }
  return newest;
};

const needsRebuild = (force) => {
  if (force) {
    return { shouldBuild: true, reason: 'force flag', forceEmit: true };
  }

  for (const output of requiredOutputs) {
    if (!fs.existsSync(output)) {
      banner(`Detected missing build artifact: ${path.relative(projectRoot, output)}`);
      return { shouldBuild: true, reason: 'missing build artifacts', forceEmit: true };
    }
  }

  const outputMtime = newestMtime(requiredOutputs);
  const sourceMtime = newestMtime(trackedSources);

  if (sourceMtime > outputMtime) {
    banner('Source files changed since last Electron build');
    return { shouldBuild: true, reason: 'source files are newer', forceEmit: false };
  }

  return { shouldBuild: false };
};

const tsbuildInfoPath = path.join(distRoot, 'tsconfig.electron.tsbuildinfo');

const runTscBuild = (forceEmit) => {
  banner('Running TypeScript build for Electron (tsconfig.electron.json)');

  if (forceEmit && fs.existsSync(tsbuildInfoPath)) {
    banner('Removing stale tsconfig.electron.tsbuildinfo to force full emit');
    fs.rmSync(tsbuildInfoPath, { force: true });
  }

  const binName = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const tscBin = path.join(projectRoot, 'node_modules', '.bin', binName);

  if (!fs.existsSync(tscBin)) {
    console.error('[ensure-electron-dist] Cannot find local TypeScript binary. Did you run npm install?');
    process.exitCode = 1;
    return false;
  }

  const args = ['-p', 'tsconfig.electron.json'];

  const result = spawnSync(tscBin, args, {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error('[ensure-electron-dist] Failed to launch TypeScript compiler:', result.error);
    process.exitCode = result.status ?? 1;
    return false;
  }

  if (result.status !== 0) {
    console.error(`[ensure-electron-dist] TypeScript compiler exited with code ${result.status}`);
    process.exitCode = result.status;
    return false;
  }

  return true;
};

const verifyOutputs = () => {
  const missing = requiredOutputs.filter((output) => !fs.existsSync(output));
  if (missing.length === 0) {
    banner('Electron build artifacts verified');
    return true;
  }

  console.error('[ensure-electron-dist] Electron build artifacts are still missing:',
    missing.map((file) => path.relative(projectRoot, file)));
  process.exitCode = 1;
  return false;
};

const main = () => {
  const force = process.argv.includes('--force');

  ensureDistPackage();

  const decision = needsRebuild(force);

  if (decision.shouldBuild) {
    if (!runTscBuild(decision.forceEmit)) {
      return;
    }
  } else {
    banner('Electron build artifacts are up to date');
  }

  ensureDistPackage();
  verifyOutputs();
};

main();
