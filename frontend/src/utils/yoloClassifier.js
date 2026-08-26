import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;

export const loadYoloModel = async () => {
  if (!model) {
    await tf.ready();
    model = await cocoSsd.load();
  }
  return model;
};

const classToWasteType = {
  'bottle': 'Plastic',
  'cup': 'Plastic',
  'fork': 'Plastic',
  'knife': 'Metal',
  'spoon': 'Metal',
  'bowl': 'Plastic',
  'banana': 'Organic',
  'apple': 'Organic',
  'sandwich': 'Organic',
  'orange': 'Organic',
  'broccoli': 'Organic',
  'carrot': 'Organic',
  'hot dog': 'Organic',
  'pizza': 'Organic',
  'donut': 'Organic',
  'cake': 'Organic',
  'tv': 'E-Waste',
  'laptop': 'E-Waste',
  'mouse': 'E-Waste',
  'remote': 'E-Waste',
  'keyboard': 'E-Waste',
  'cell phone': 'E-Waste',
  'microwave': 'E-Waste',
  'oven': 'E-Waste',
  'toaster': 'E-Waste',
  'refrigerator': 'E-Waste',
  'book': 'Paper',
  'paper': 'Paper'
};

export const analyzeImageLocal = async (imageElement) => {
  const net = await loadYoloModel();
  const predictions = await net.detect(imageElement);
  
  if (predictions.length === 0) {
    return { aiAvailable: true, wasteType: 'Mixed', confidence: 0.5, tips: 'Could not clearly detect objects. Classified as Mixed.' };
  }

  // Get the most confident prediction that maps to a waste type
  let bestMatch = null;
  let highestConf = 0;

  for (const p of predictions) {
    const mappedType = classToWasteType[p.class];
    if (mappedType && p.score > highestConf) {
      highestConf = p.score;
      bestMatch = { type: mappedType, original: p.class };
    }
  }

  if (bestMatch) {
    return {
      aiAvailable: true,
      wasteType: bestMatch.type,
      confidence: highestConf,
      tips: `Locally detected a ${bestMatch.original}. Classified as ${bestMatch.type}.`
    };
  } else {
    return {
      aiAvailable: true,
      wasteType: 'General Waste',
      confidence: predictions[0].score,
      tips: `Detected ${predictions[0].class} which doesn't have a specific recycling category. Marked as General Waste.`
    };
  }
};
