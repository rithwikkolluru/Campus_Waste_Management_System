// These are ONLY constants used for styling/config — NO fake data
export const STATUS_FLOW = ['Reported', 'Under Review', 'Assigned to Staff', 'Cleaning in Progress', 'Resolved'];

export const STATUS_COLOR = {
  'Reported':              'badge-red',
  'Under Review':          'badge-yellow',
  'Assigned to Staff':     'badge-blue',
  'Cleaning in Progress':  'badge-purple',
  'Resolved':              'badge-green',
  // DB lowercase variants
  'reported':              'badge-red',
  'under_review':          'badge-yellow',
  'assigned':              'badge-blue',
  'in_progress':           'badge-purple',
  'resolved':              'badge-green',
};

export const PRIORITY_COLOR = {
  'High':   'badge-red',
  'Medium': 'badge-yellow',
  'Low':    'badge-green',
  'high':   'badge-red',
  'medium': 'badge-yellow',
  'low':    'badge-green',
};

// Zone config (icons only — real counts come from the backend)
export const ZONES = [
  { id: 1, name: 'Hostel Area',    icon: '🏠' },
  { id: 2, name: 'Academic Block', icon: '🏫' },
  { id: 3, name: 'Library',        icon: '📚' },
  { id: 4, name: 'Canteen',        icon: '🍽️' },
  { id: 5, name: 'Parking Area',   icon: '🅿️' },
  { id: 6, name: 'Sports Ground',  icon: '⚽' },
];
