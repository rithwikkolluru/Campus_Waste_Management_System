/**
 * exifParser.js - Backend binary EXIF inspector
 * Inspects uploaded Multer image files on the server for camera make/model
 * and known AI/generative software tags.
 */

const fs = require('fs');

const KNOWN_AI_GENERATORS = [
  'midjourney',
  'stable diffusion',
  'dall-e',
  'dalle',
  'comfyui',
  'automatic1111',
  'novelai',
  'firefly',
  'flux',
  'craiyon',
  'bing image creator',
  'nightcafe',
  'adobe photoshop',
  'canva',
  'gimp'
];

/**
 * Inspect server-side uploaded file buffer for EXIF metadata.
 * @param {string} filePath 
 * @returns {Promise<Object>}
 */
async function inspectServerPhoto(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { hasExif: false, isSuspicious: false };
    }

    // Read first 128KB of image header
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(128 * 1024);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const data = buffer.subarray(0, bytesRead);
    const headerStr = data.toString('latin1');

    let suspiciousSoftware = null;
    const lowerStr = headerStr.toLowerCase();

    for (const tool of KNOWN_AI_GENERATORS) {
      if (lowerStr.includes(tool)) {
        suspiciousSoftware = tool;
        break;
      }
    }

    // Check for standard EXIF presence
    const hasExifMarker = headerStr.includes('Exif');

    return {
      hasExif: hasExifMarker,
      suspiciousSoftware,
      isSuspicious: Boolean(suspiciousSoftware),
      reason: suspiciousSoftware 
        ? `Found software metadata matching generative AI or photo editor: ${suspiciousSoftware}`
        : ''
    };
  } catch (err) {
    console.warn('Server EXIF inspect error:', err.message);
    return { hasExif: false, isSuspicious: false, reason: '' };
  }
}

module.exports = {
  inspectServerPhoto,
  KNOWN_AI_GENERATORS
};
