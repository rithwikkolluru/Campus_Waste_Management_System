const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

// Initialize Gemini - gracefully handle missing API key
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set - AI features disabled');
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const isRateLimitError = (err) =>
  err?.status === 429 ||
  String(err?.message || '').includes('429') ||
  String(err?.message || '').toLowerCase().includes('quota');

// Try primary model, fall back to lite when free-tier quota is hit
const generateWithFallback = async (genAI, parts) => {
  let lastError;
  for (const modelName of MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        console.warn(`Gemini ${modelName} rate limited — trying fallback`);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All Gemini models unavailable');
};

// Helper: convert image file to base64 for Gemini
const imageToBase64 = (filePath) => {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
};

// Helper: get file mime type
const getMimeType = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', 
                  png: 'image/png', webp: 'image/webp' };
  return types[ext] || 'image/jpeg';
};

// ─────────────────────────────────────────
// FUNCTION 1: Classify waste type + bin
// ─────────────────────────────────────────
const classifyWaste = async (imagePath) => {
  const genAI = getGeminiClient();
  
  // If no API key, return safe defaults
  if (!genAI) {
    return {
      wasteType: 'General Waste',
      binColor: 'Black',
      binLabel: 'Landfill',
      confidence: 0,
      tips: 'AI classification unavailable - please classify manually',
      aiAvailable: false
    };
  }

  try {
    const imageData = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    const prompt = `Analyze this civic waste/garbage image and respond in this exact JSON format only, no other text:
{
  "wasteType": "one of: Plastic, Organic, E-Waste, Paper, Metal, Glass, Hazardous, Construction & Demolition, Mixed, General Waste",
  "binColor": "one of: Blue, Green, Red, Yellow, Black",
  "binLabel": "one of: Dry Recyclable, Wet Biodegradable, Hazardous, E-Waste, Landfill",
  "confidence": number between 0 and 100,
  "tips": "one short sentence disposal tip according to Municipal Solid Waste guidelines",
  "isWaste": true or false
}
IMPORTANT: If the image is a selfie, screenshot, person, pet, stock photo, or anything that is NOT clearly discarded waste/garbage on public/private premises, you MUST set isWaste to false to prevent civic reward fraud.`;

    const text = await generateWithFallback(genAI, [
      prompt,
      { inlineData: { data: imageData, mimeType } },
    ]);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    return { ...parsed, aiAvailable: true };
  } catch (err) {
    console.error('Gemini classifyWaste error:', err.message);
    return {
      wasteType: 'General Waste',
      binColor: 'Black', 
      binLabel: 'Landfill',
      confidence: 0,
      tips: 'Could not classify - please classify manually',
      isWaste: true,
      aiAvailable: false
    };
  }
};

// ─────────────────────────────────────────
// FUNCTION 2: Fake photo + duplicate check
// ─────────────────────────────────────────
const validateWastePhoto = async (imagePath, recentDescriptions = []) => {
  const genAI = getGeminiClient();
  
  if (!genAI) {
    return { isValid: true, isFake: false, isDuplicate: false, 
             reason: '', aiAvailable: false };
  }

  try {
    const imageData = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    const recentContext = recentDescriptions.length > 0
      ? `Recent reports in last 2 hours: ${recentDescriptions.slice(0, 5).join(' | ')}`
      : 'No recent reports to compare.';

    const prompt = `Analyze this image for a campus waste reporting system. Monetary rewards are tied to these submissions, so you MUST BE EXTREMELY STRICT to prevent fraud and scams.
${recentContext}

Respond in this exact JSON format only, no other text:
{
  "isWaste": true or false (does the image clearly and undeniably contain actual waste, garbage, or litter?),
  "isFake": true or false (Set to TRUE if this is a selfie, a screenshot, a photo of a screen, stock photography, a random clean object, or anything suspicious that is not clearly discarded garbage),
  "isDuplicate": true or false (does this look very similar to a recent report above?),
  "severity": number 1-10 (1=small wrapper, 10=massive overflow),
  "description": "one sentence describing exactly what waste is visible",
  "reason": "If isFake or isDuplicate is true, provide a detailed reason why it was rejected. Otherwise empty string."
}
IMPORTANT: If the image does not unambiguously show discarded garbage or waste meant to be cleaned up on a campus, set "isFake" to true and "isWaste" to false. Do not be lenient.`;

    const text = await generateWithFallback(genAI, [
      prompt,
      { inlineData: { data: imageData, mimeType } },
    ]);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return { ...parsed, aiAvailable: true };
  } catch (err) {
    console.error('Gemini validatePhoto error:', err.message);
    return { isValid: true, isFake: false, isDuplicate: false,
             severity: 5, description: '', reason: '', aiAvailable: false };
  }
};

// ─────────────────────────────────────────
// FUNCTION 3: Severity scoring
// ─────────────────────────────────────────
const scoreSeverity = async (imagePath) => {
  const genAI = getGeminiClient();
  
  if (!genAI) {
    return { severity: 5, priority: 'Medium', 
             reason: 'AI unavailable', aiAvailable: false };
  }

  try {
    const imageData = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    const prompt = `Rate the severity of this waste/garbage situation for a campus cleaning team.
Respond in this exact JSON format only, no other text:
{
  "severity": number 1-10,
  "priority": "one of: Low, Medium, High, Critical",
  "reason": "one sentence why this severity level",
  "estimatedCleanupMinutes": number (how many minutes to clean)
}
Severity guide: 1-2=tiny litter, 3-4=small pile, 5-6=moderate mess, 
7-8=large overflow, 9-10=health hazard or huge area affected.`;

    const text = await generateWithFallback(genAI, [
      prompt,
      { inlineData: { data: imageData, mimeType } },
    ]);
    const clean = text.replace(/```json|```/g, '').trim();
    return { ...JSON.parse(clean), aiAvailable: true };
  } catch (err) {
    console.error('Gemini scoreSeverity error:', err.message);
    return { severity: 5, priority: 'Medium', 
             reason: 'Could not analyze', aiAvailable: false };
  }
};

// ─────────────────────────────────────────
// FUNCTION 4: Weekly analysis report
// ─────────────────────────────────────────
const generateWeeklyReport = async (reportData) => {
  const genAI = getGeminiClient();
  
  if (!genAI) {
    return { 
      summary: 'AI analysis unavailable - add GEMINI_API_KEY to .env',
      aiAvailable: false 
    };
  }

  try {
    const prompt = `You are analyzing waste management data for a college campus.
Here is this week's waste report data:
${JSON.stringify(reportData, null, 2)}

Generate a weekly analysis in this exact JSON format only, no other text:
{
  "summary": "2-3 sentence overall summary",
  "topProblematicAreas": ["area1", "area2", "area3"],
  "mostCommonWasteType": "waste type name",
  "totalReportsThisWeek": number,
  "resolvedPercentage": number,
  "trend": "one of: Improving, Worsening, Stable",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "studentEngagement": "one sentence about student participation",
  "urgentAreas": ["areas needing immediate attention"]
}`;

    const text = await generateWithFallback(genAI, [prompt]);
    const clean = text.replace(/```json|```/g, '').trim();
    return { ...JSON.parse(clean), aiAvailable: true };
  } catch (err) {
    console.error('Gemini weeklyReport error:', err.message);
    return { 
      summary: 'Could not generate report',
      aiAvailable: false 
    };
  }
};

module.exports = { 
  classifyWaste, 
  validateWastePhoto, 
  scoreSeverity, 
  generateWeeklyReport 
};
