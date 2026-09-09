/**
 * Telangana State Administrative Geo-Hierarchy & Civic Categories Dataset
 * Supports statewide municipal reporting across all 33 districts, ULBs, and wards.
 */

export const CIVIC_ISSUE_CATEGORIES = [
  { id: 'garbage_waste', label: 'Garbage / Waste', icon: '🗑️', color: '#10b981', defaultPriority: 'Medium' },
  { id: 'overflowing_dustbin', label: 'Overflowing Dustbin', icon: '📦', color: '#f59e0b', defaultPriority: 'High' },
  { id: 'illegal_dumping', label: 'Illegal Dumping', icon: '⚠️', color: '#ef4444', defaultPriority: 'High' },
  { id: 'road_damage', label: 'Road Damage', icon: '🚧', color: '#ca8a04', defaultPriority: 'Medium' },
  { id: 'open_drain', label: 'Open Drain', icon: '🌊', color: '#0ea5e9', defaultPriority: 'High' },
  { id: 'water_leakage', label: 'Water Leakage', icon: '💧', color: '#3b82f6', defaultPriority: 'Medium' },
  { id: 'streetlight_issue', label: 'Streetlight Issue', icon: '💡', color: '#eab308', defaultPriority: 'Low' },
  { id: 'public_toilet', label: 'Public Toilet Issue', icon: '🚻', color: '#8b5cf6', defaultPriority: 'Medium' },
  { id: 'plastic_waste', label: 'Plastic Waste', icon: '🛍️', color: '#ec4899', defaultPriority: 'Medium' },
  { id: 'sanitation_issue', label: 'Sanitation Issue', icon: '🧹', color: '#14b8a6', defaultPriority: 'High' },
  { id: 'environmental_pollution', label: 'Environmental Pollution', icon: '🏭', color: '#dc2626', defaultPriority: 'High' },
  { id: 'other_civic_issue', label: 'Other Civic Issue', icon: '📋', color: '#64748b', defaultPriority: 'Low' },
];

export const TELANGANA_DISTRICTS = [
  'Adilabad',
  'Bhadradri Kothagudem',
  'Hanamkonda',
  'Hyderabad',
  'Jagtial',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Jogulamba Gadwal',
  'Kamareddy',
  'Karimnagar',
  'Khammam',
  'Komaram Bheem Asifabad',
  'Mahabubabad',
  'Mahabubnagar',
  'Mancherial',
  'Medak',
  'Medchal-Malkajgiri',
  'Mulugu',
  'Nagarkurnool',
  'Nalgonda',
  'Narayanpet',
  'Nirmal',
  'Nizamabad',
  'Peddapalli',
  'Rajanna Sircilla',
  'Ranga Reddy',
  'Sangareddy',
  'Siddipet',
  'Suryapet',
  'Vikarabad',
  'Wanaparthy',
  'Warangal',
  'Yadadri Bhuvanagiri'
];

export const STATES_AND_DISTRICTS = {
  Telangana: TELANGANA_DISTRICTS,
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool',
    'Nellore', 'Anantapur', 'Rajahmundry', 'Kakinada', 'Kadapa'
  ],
  Karnataka: [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi'
  ],
  Maharashtra: [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'
  ],
  Delhi: [
    'Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'
  ]
};

export const MUNICIPAL_CORPORATIONS = {
  Hyderabad: 'Greater Hyderabad Municipal Corporation (GHMC)',
  'Medchal-Malkajgiri': 'Nizampet / Boduppal / Peerzadiguda Municipalities',
  'Ranga Reddy': 'Badangpet / Bandlaguda Jagir / Meerpet Municipalities',
  Warangal: 'Greater Warangal Municipal Corporation (GWMC)',
  Hanamkonda: 'Greater Warangal Municipal Corporation (GWMC)',
  Karimnagar: 'Karimnagar Municipal Corporation (MCK)',
  Nizamabad: 'Nizamabad Municipal Corporation (NMC)',
  Khammam: 'Khammam Municipal Corporation (KMC)',
  Peddapalli: 'Ramagundam Municipal Corporation',
  Mahabubnagar: 'Mahabubnagar Municipality',
  Siddipet: 'Siddipet Municipality',
  Nalgonda: 'Nalgonda Municipality',
  Suryapet: 'Suryapet Municipality',
  Sangareddy: 'Sangareddy Municipality',
  Adilabad: 'Adilabad Municipality',
  Mancherial: 'Mancherial Municipality',
  Jagtial: 'Jagtial Municipality',
  Nirmal: 'Nirmal Municipality',
  'Rajanna Sircilla': 'Sircilla Municipality',
  'Yadadri Bhuvanagiri': 'Bhuvanagiri Municipality'
};

export const DISTRICT_MANDALS = {
  Hyderabad: ['Khairatabad', 'Ameerpet', 'Asifnagar', 'Bahadurpura', 'Bandlaguda', 'Charminar', 'Golconda', 'Himayathnagar', 'Marredpally', 'Musheerabad', 'Secunderabad', 'Shaikpet', 'Tirumalagiri'],
  'Ranga Reddy': ['Serilingampally', 'Rajendranagar', 'Gandipet', 'Chevella', 'Ibrahimpatnam', 'Maheshwaram', 'Saroornagar', 'Hayathnagar'],
  'Medchal-Malkajgiri': ['Kukatpally', 'Quthbullapur', 'Alwal', 'Malkajgiri', 'Uppal', 'Kapra', 'Ghatkesar', 'Medchal'],
  Warangal: ['Warangal Urban', 'Kazipet', 'Wardhannapet', 'Geesugonda'],
  Hanamkonda: ['Hanamkonda', 'Bheemadevarpalle', 'Dharmasagar', 'Elkathurthy', 'Hasanparthy'],
  Karimnagar: ['Karimnagar Urban', 'Karimnagar Rural', 'Manakondur', 'Choppadandi', 'Gangadhara'],
  Nizamabad: ['Nizamabad North', 'Nizamabad South', 'Armoor', 'Bodhan', 'Dichpally'],
  Khammam: ['Khammam Urban', 'Khammam Rural', 'Madhira', 'Wyra', 'Sathupalli'],
  Siddipet: ['Siddipet Urban', 'Siddipet Rural', 'Gajwel', 'Dubbak', 'Husnabad']
};

export const DEFAULT_WARDS = [
  'Ward 1 - Central Administrative Circle',
  'Ward 2 - Heritage & Market Zone',
  'Ward 3 - Railway Station & Transit Hub',
  'Ward 4 - Commercial & Business District',
  'Ward 5 - Residential Sector A',
  'Ward 6 - Residential Sector B',
  'Ward 7 - Industrial & Logistics Area',
  'Ward 8 - Hospital & Health Center Belt',
  'Ward 9 - Municipal Park & Green Zone',
  'Ward 10 - Lake Shore & Watershed Perimeter',
  'Ward 11 - Outer Ring Road Corridor',
  'Ward 12 - Urban Local Colony'
];

export const TELANGANA_MUNICIPAL_ZONES = [
  { id: 1, name: 'GHMC Central Zone - Khairatabad Circle', emoji: '🏛️', district: 'Hyderabad' },
  { id: 2, name: 'GHMC West Zone - Serilingampally Circle', emoji: '🏙️', district: 'Hyderabad' },
  { id: 3, name: 'Greater Warangal Municipal Corporation (GWMC)', emoji: '🏛️', district: 'Warangal' },
  { id: 4, name: 'Karimnagar Municipal Corporation (MCK)', emoji: '🏢', district: 'Karimnagar' },
  { id: 5, name: 'Nizamabad Central Municipal Zone', emoji: '📍', district: 'Nizamabad' },
  { id: 6, name: 'Khammam Municipal Corporation (KMC)', emoji: '🌿', district: 'Khammam' },
];
