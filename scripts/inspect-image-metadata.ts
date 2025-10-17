import { DirectoryScanner } from '../src/main/tools/image/DirectoryScanner';

async function main() {
  const scanner = new DirectoryScanner();
  const dir = '/home/ubuntu22/桌面';
  console.log('Scanning directory', dir);
  const res = await scanner.scan(dir, { includeSubdirectories: false, limit: 200 });
  const target = res.assets.find(a => a.name === 'fbca9468-62ad-4306-bf2b-707d38bc4a6c.JPG');
  if (!target) {
    console.error('Target image not found in scan results');
    process.exit(2);
  }
  console.log('Found asset:');
  console.log('name:', target.name);
  console.log('width, height:', target.width, target.height);
  console.log('format:', target.format);
  console.log('exif:', JSON.stringify(target.exif, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
