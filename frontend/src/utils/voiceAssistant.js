/**
 * voiceAssistant.js
 * 100% Free, In-Built Browser-Native Speech Synthesis + Bilingual Telugu/English Civic Dictionary.
 * Zero API keys or cloud subscriptions needed.
 */

// Civic domain dictionary for instant translation into Telugu
export const TELUGU_CIVIC_DICTIONARY = {
  // Waste Types
  'plastic': 'ప్లాస్టిక్ చెత్త',
  'organic': 'సేంద్రీయ తడి చెత్త',
  'e-waste': 'ఎలక్ట్రానిక్ వ్యర్థాలు',
  'paper': 'కాగితపు వ్యర్థాలు',
  'metal': 'లోహపు చెత్త',
  'glass': 'గాజు వ్యర్థాలు',
  'hazardous': 'ప్రమాదకరమైన వ్యర్థాలు',
  'general waste': 'సాధారణ చెత్త',
  'mixed': 'మిశ్రమ వ్యర్థాలు',

  // Statuses & Priorities
  'reported': 'కొత్తగా నమోదైంది',
  'assigned': 'పని కేటాయించబడింది',
  'in_progress': 'శుభ్రం చేసే పని జరుగుతోంది',
  'under_review': 'పరిశీలనలో ఉంది',
  'resolved': 'శుభ్రం చేయబడింది',
  'critical': 'అత్యవసరం',
  'high': 'అధిక ప్రాధాన్యత',
  'medium': 'మధ్యస్థం',
  'low': 'సాధారణం',

  // Bin Status
  'active': 'సాధారణంగా ఉంది',
  'full': 'పూర్తిగా నిండింది',
  'maintenance': 'మరమ్మత్తులో ఉంది',

  // Locations / Common Campus words
  'hostel area': 'హాస్టల్ ప్రాంతం',
  'canteen': 'క్యాంటీన్ పరిసరాలు',
  'academic block': 'తరగతి గదుల భవనం',
  'library': 'గ్రంథాలయం',
  'sports ground': 'ఆటస్థలం',
};

/**
 * Translate key civic terms into Telugu
 */
export function translateToTelugu(text = '') {
  if (!text) return '';
  let translated = String(text).toLowerCase();

  // Word/Phrase replacements
  for (const [eng, tel] of Object.entries(TELUGU_CIVIC_DICTIONARY)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, tel);
  }

  return translated;
}

/**
 * Generate speech text for a garbage report in specified language
 */
export function generateReportAnnouncement(report, lang = 'en') {
  if (!report) return '';

  const id = report.id || '';
  const type = report.waste_type || 'General Waste';
  const location = report.ward_number || report.zone_name || report.district || 'Location';
  const priority = report.priority || (report.ai_severity >= 7 ? 'Critical' : 'Normal');

  if (lang === 'te') {
    const telType = TELUGU_CIVIC_DICTIONARY[type.toLowerCase()] || type;
    const telPri = TELUGU_CIVIC_DICTIONARY[priority.toLowerCase()] || priority;
    return `ఫిర్యాదు నంబర్ ${id}. ${location} వద్ద ${telType} ఉంది. ప్రాధాన్యత: ${telPri}. దయచేసి వెంటనే పరిశీలించి శుభ్రం చేయండి.`;
  }

  return `Report Number ${id}. ${type} detected at ${location}. Priority level is ${priority}. Please inspect and resolve immediately.`;
}

/**
 * Generate speech text for a bin status
 */
export function generateBinAnnouncement(bin, lang = 'en') {
  if (!bin) return '';

  const location = bin.location_desc || bin.zone_name || 'Waste bin';
  const fill = bin.fill_level !== undefined ? bin.fill_level : 0;
  const category = bin.bin_type || 'General';

  if (lang === 'te') {
    const telCat = TELUGU_CIVIC_DICTIONARY[category.toLowerCase()] || category;
    if (fill >= 80) {
      return `హెచ్చరిక! ${location} వద్ద ఉన్న ${telCat} డస్ట్‌బిన్ ${fill} శాతం నిండింది. వెంటనే ఖాళీ చేసి సేకరించాలి.`;
    }
    return `${location} వద్ద ఉన్న ${telCat} డస్ట్‌బిన్ ${fill} శాతం నిండి ఉంది. స్థితి సాధారణం.`;
  }

  if (fill >= 80) {
    return `Urgent alert! Bin at ${location} for ${category} waste is ${fill} percent full. Immediate collection required.`;
  }
  return `Bin at ${location} for ${category} waste is at ${fill} percent capacity. Status normal.`;
}

/**
 * Generate navigation guidance speech
 */
export function generateNavigationAnnouncement(destinationName, distanceMeters, durationMins, lang = 'en') {
  const dist = distanceMeters > 1000 
    ? `${(distanceMeters / 1000).toFixed(1)} kilometers` 
    : `${Math.round(distanceMeters)} meters`;

  if (lang === 'te') {
    const telDist = distanceMeters > 1000 
      ? `${(distanceMeters / 1000).toFixed(1)} కిలోమీటర్లు` 
      : `${Math.round(distanceMeters)} మీటర్లు`;
    return `${destinationName} వైపు నావిగేషన్ ప్రారంభమైంది. దూరం సుమారు ${telDist}, సమయం ${Math.round(durationMins)} నిమిషాలు పడుతుంది. ముందుకు నడవండి.`;
  }

  return `Starting navigation to ${destinationName}. Distance is approximately ${dist}, estimated walking time is ${Math.round(durationMins)} minutes. Proceed ahead.`;
}

/**
 * Find the most natural voice for a given language code
 * Prefers natural voices from Microsoft Edge, Google, or native device OS
 */
function findBestVoice(lang = 'en') {
  if (!('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === 'te') {
    // Look for Telugu voices: te-IN, Telugu, etc.
    const teluguVoice = voices.find(v => 
      v.lang.toLowerCase().includes('te') || 
      v.name.toLowerCase().includes('telugu')
    );
    if (teluguVoice) return teluguVoice;

    // Fallback to Indian English if Telugu speech model is not installed on the device
    const indianVoice = voices.find(v => v.lang.toLowerCase().includes('en-in'));
    if (indianVoice) return indianVoice;
  }

  // Look for English voices: prefer en-IN, en-US natural Microsoft / Google voices
  const preferredVoice = voices.find(v => 
    (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Microsoft')) &&
    (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en-us'))
  );

  return preferredVoice || voices.find(v => v.lang.startsWith('en')) || voices[0];
}

/**
 * Core text-to-speech speaker function
 * @param {string} text 
 * @param {string} lang 'en' or 'te'
 * @param {Function} onStart 
 * @param {Function} onEnd 
 */
export function speakText(text, lang = 'en', onStart = () => {}, onEnd = () => {}) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  if (!text) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'te' ? 'te-IN' : 'en-IN';
  utterance.rate = lang === 'te' ? 0.9 : 0.95; // Slightly slower for clear regional articulation
  utterance.pitch = 1.0;

  const voice = findBestVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    onStart();
  };

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Stop any current speaking
 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
