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

// Municipal Solid Waste (MSW) classification mappings for Smart Cities
const classToWasteType = {
  // Dry Recyclable - Plastics & Packaging
  'bottle': 'Plastic',
  'cup': 'Plastic',
  'fork': 'Plastic',
  'bowl': 'Plastic',
  'backpack': 'Dry Waste',
  'handbag': 'Dry Waste',
  'suitcase': 'Dry Waste',
  
  // Dry Recyclable - Metal
  'knife': 'Metal',
  'spoon': 'Metal',
  'scissors': 'Metal',
  'chair': 'Metal',

  // Dry Recyclable - Paper & Cellulose
  'book': 'Paper',
  'paper': 'Paper',

  // Wet & Organic / Biodegradable Waste
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
  'potted plant': 'Organic',

  // E-Waste & Electronics
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
  'clock': 'E-Waste',

  // Construction & Demolition / Bulky Waste
  'bed': 'Construction & Demolition',
  'toilet': 'Construction & Demolition',
  'couch': 'Construction & Demolition',
  'bench': 'Construction & Demolition',
};

export const analyzeImageLocal = async (imageElement) => {
  const net = await loadYoloModel();
  const predictions = await net.detect(imageElement);
  
  if (predictions.length === 0) {
    return {
      aiAvailable: true,
      wasteType: 'Mixed',
      confidence: 50,
      binColor: 'Black',
      binLabel: 'Landfill / Mixed',
      tips: 'Could not clearly isolate individual items. Classified as Mixed Municipal Waste.'
    };
  }

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
    let binColor = 'Blue';
    let binLabel = 'Dry Recyclables';
    if (bestMatch.type === 'Organic') {
      binColor = 'Green';
      binLabel = 'Wet / Compostable';
    } else if (bestMatch.type === 'E-Waste' || bestMatch.type === 'Hazardous') {
      binColor = 'Red';
      binLabel = 'Hazardous / E-Waste';
    }

    return {
      aiAvailable: true,
      wasteType: bestMatch.type,
      confidence: Math.round(highestConf * 100),
      binColor,
      binLabel,
      tips: `AI Object Detection identified ${bestMatch.original}. Recommended disposal in ${binColor} Bin (${binLabel}).`
    };
  } else {
    return {
      aiAvailable: true,
      wasteType: 'General Waste',
      confidence: Math.round(predictions[0].score * 100),
      binColor: 'Blue',
      binLabel: 'Municipal Waste',
      tips: `Detected ${predictions[0].class}. Dispose in Municipal Collection Bin.`
    };
  }
};

