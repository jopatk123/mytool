const { ImageMetadataExtractor } = require('../dist-electron/src/main/tools/image/ImageMetadataExtractor.js');

(async () => {
  const filePath = '/home/ubuntu22/桌面/fbca9468-62ad-4306-bf2b-707d38bc4a6c.JPG';
  console.log('Inspecting', filePath);
  try {
    const meta = await ImageMetadataExtractor.extractMetadata(filePath);
    console.log('Metadata result:', JSON.stringify(meta, null, 2));
  } catch (err) {
    console.error('Error while extracting metadata:', err);
    process.exit(1);
  }
})();
