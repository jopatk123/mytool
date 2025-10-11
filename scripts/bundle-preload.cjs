/**
 * Bundle preload script using esbuild
 *
 * Electron's sandbox mode requires the preload script to be a single bundled file
 * because it cannot resolve relative module imports at runtime.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--dev');

const buildPreload = async () => {
  const outfile = path.join(__dirname, '../dist-electron/src/main/preload.js');

  console.log('[bundle-preload] Bundling preload script...');

  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, '../src/main/preload.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile,
      external: ['electron'],
      sourcemap: isDev ? 'inline' : false,
      minify: !isDev,
      // Keep original file for type definitions
      metafile: false,
      logLevel: 'info',
    });

    console.log('[bundle-preload] ✅ Preload script bundled successfully');
    console.log(`[bundle-preload] Output: ${outfile}`);

    // Verify the output exists
    if (!fs.existsSync(outfile)) {
      throw new Error('Bundled preload script not found');
    }

    const stats = fs.statSync(outfile);
    console.log(`[bundle-preload] Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('[bundle-preload] ❌ Failed to bundle preload script:', error);
    process.exit(1);
  }
};

buildPreload();
