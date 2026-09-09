// CleanState AI – Civic Status & Municipal Zone Constants
export const STATUS_FLOW = ['Reported', 'Under Review', 'Assigned to Staff', 'Cleaning in Progress', 'Resolved'];

export const CIVIC_STATUS_FLOW = ['Submitted', 'Under Verification', 'Assigned', 'In Progress', 'Resolved'];

export const STATUS_COLOR = {
  'Reported':              'badge-red',
  'Under Review':          'badge-yellow',
  'Assigned to Staff':     'badge-blue',
  'Cleaning in Progress':  'badge-purple',
  'Resolved':              'badge-green',
  // Civic statuses
  'Submitted':             'badge-yellow',
  'Under Verification':    'badge-yellow',
  'Verified':              'badge-blue',
  'Assigned':              'badge-blue',
  'In Progress':           'badge-purple',
  'Dispatched':            'badge-purple',
  'Rejected':              'badge-red',
  'Closed':                'badge-gray',
  // Lowercase variants
  'submitted':             'badge-yellow',
  'reported':              'badge-red',
  'under_verification':    'badge-yellow',
  'under_review':          'badge-yellow',
  'verified':              'badge-blue',
  'assigned':              'badge-blue',
  'in_progress':           'badge-purple',
  'dispatched':            'badge-purple',
  'resolved':              'badge-green',
  'rejected':              'badge-red',
  'closed':                'badge-gray',
};

export const PRIORITY_COLOR = {
  'Critical': 'badge-red',
  'High':     'badge-red',
  'Medium':   'badge-yellow',
  'Low':      'badge-green',
  'critical': 'badge-red',
  'high':     'badge-red',
  'medium':   'badge-yellow',
  'low':      'badge-green',
};

// Real Telangana Municipal Division / Circle config
export const ZONES = [
  { id: 1, name: 'GHMC Central Zone - Khairatabad Circle', icon: '🏛️' },
  { id: 2, name: 'GHMC West Zone - Serilingampally Circle', icon: '🏙️' },
  { id: 3, name: 'Greater Warangal Municipal Corporation (GWMC)', icon: '🏛️' },
  { id: 4, name: 'Karimnagar Municipal Corporation (MCK)', icon: '🏢' },
  { id: 5, name: 'Nizamabad Central Municipal Zone', icon: '📍' },
  { id: 6, name: 'Khammam Municipal Corporation (KMC)', icon: '🌿' },
];
