import L from 'leaflet';

// Create colored circle pin icons using SVG
const createPinIcon = (color, size = 32, emoji = '🗑️') => {
  const colors = {
    red:    { fill: '#ef4444', stroke: '#dc2626' },
    orange: { fill: '#f97316', stroke: '#ea580c' },
    yellow: { fill: '#eab308', stroke: '#ca8a04' },
    green:  { fill: '#22c55e', stroke: '#16a34a' },
    blue:   { fill: '#3b82f6', stroke: '#2563eb' },
    purple: { fill: '#a855f7', stroke: '#9333ea' },
  };

  const c = colors[color] || colors.orange;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${size}" height="${size + 8}"
         viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="14"
        fill="${c.fill}" stroke="${c.stroke}"
        stroke-width="2"/>
      <text x="16" y="21"
        text-anchor="middle"
        font-size="14">${emoji}</text>
      <polygon points="16,38 10,26 22,26"
        fill="${c.fill}"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
};

// User location pulsing dot icon
const createUserIcon = () => L.divIcon({
  html: `
    <div style="
      width:16px; height:16px;
      background:#3b82f6;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 8px rgba(59,130,246,0.25),
                 0 0 0 16px rgba(59,130,246,0.1);
    "></div>
  `,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const WASTE_EMOJI = {
  'Plastic':       '♻️',
  'Organic':       '🍃',
  'E-waste':       '⚡',
  'Paper':         '📄',
  'Metal':         '🔩',
  'Glass':         '🫙',
  'Hazardous':     '☢️',
  'General Waste': '🗑️',
};

const getMarkerIcon = (marker) =>
  createPinIcon(
    marker.pinColor,
    marker.severity >= 7 ? 38 : 32,
    WASTE_EMOJI[marker.wasteType] || '🗑️'
  );

export { createPinIcon, createUserIcon, getMarkerIcon, WASTE_EMOJI };
