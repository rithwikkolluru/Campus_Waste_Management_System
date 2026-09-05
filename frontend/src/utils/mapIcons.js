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

const createDistrictClusterIcon = (district) => {
  const isCritical = district.critical > 0;
  return L.divIcon({
    html: `
      <div style="
        background: ${isCritical ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)'};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: sans-serif;
        font-weight: bold;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <span style="font-size: 11px;">${district.total}</span>
        <span style="font-size: 8px; opacity: 0.9;">${district.name.slice(0, 3).toUpperCase()}</span>
      </div>
    `,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

export { createPinIcon, createUserIcon, getMarkerIcon, createDistrictClusterIcon, WASTE_EMOJI };

