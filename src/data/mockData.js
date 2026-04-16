export const REPORTS = [
  { id: 'RPT-001', zone: 'Hostel Area',    type: 'Organic',   desc: 'Overflowing dustbin near Block C entrance', status: 'Resolved',            priority: 'High',   date: '2026-03-18', reporter: 'Arjun Sharma',   image: null },
  { id: 'RPT-002', zone: 'Canteen',        type: 'Mixed',     desc: 'Garbage scattered around food stalls',       status: 'Cleaning in Progress', priority: 'High',   date: '2026-03-17', reporter: 'Meena Patel',    image: null },
  { id: 'RPT-003', zone: 'Library',        type: 'Paper',     desc: 'Paper waste near reading hall exit',         status: 'Assigned to Staff',    priority: 'Medium', date: '2026-03-17', reporter: 'Ravi Singh',     image: null },
  { id: 'RPT-004', zone: 'Parking Area',   type: 'Plastic',   desc: 'Plastic bags and bottles near bike stand',   status: 'Under Review',         priority: 'Medium', date: '2026-03-16', reporter: 'Sneha Das',      image: null },
  { id: 'RPT-005', zone: 'Academic Block', type: 'E-Waste',   desc: 'Old batteries discarded in corridor',        status: 'Reported',             priority: 'Low',    date: '2026-03-16', reporter: 'Kiran Verma',   image: null },
  { id: 'RPT-006', zone: 'Hostel Area',    type: 'Organic',   desc: 'Spilled food waste near dustbin',            status: 'Under Review',         priority: 'High',   date: '2026-03-15', reporter: 'Arjun Sharma',   image: null },
  { id: 'RPT-007', zone: 'Academic Block', type: 'Mixed',     desc: 'Waste near seminar hall backdoor',           status: 'Resolved',             priority: 'Low',    date: '2026-03-14', reporter: 'Lata Iyer',      image: null },
  { id: 'RPT-008', zone: 'Canteen',        type: 'Organic',   desc: 'Kitchen waste overflow behind canteen',      status: 'Reported',             priority: 'High',   date: '2026-03-14', reporter: 'Dev Kumar',      image: null },
];

export const ZONES = [
  { id: 1, name: 'Hostel Area',    icon: '🏠', total: 24, pending: 5,  resolved: 19 },
  { id: 2, name: 'Academic Block', icon: '🏫', total: 18, pending: 3,  resolved: 15 },
  { id: 3, name: 'Library',        icon: '📚', total: 9,  pending: 1,  resolved: 8  },
  { id: 4, name: 'Canteen',        icon: '🍽️', total: 31, pending: 8,  resolved: 23 },
  { id: 5, name: 'Parking Area',   icon: '🅿️', total: 12, pending: 2,  resolved: 10 },
];

export const USERS = [
  { id: 1, name: 'Arjun Sharma',   email: 'student@campus.edu',     role: 'student',     zone: 'Hostel Area',    status: 'Active',   joined: '2025-01-10' },
  { id: 2, name: 'Priya Nair',     email: 'coordinator@campus.edu', role: 'coordinator', zone: 'Academic Block', status: 'Active',   joined: '2025-01-05' },
  { id: 3, name: 'Dr. Rajan Kumar',email: 'admin@campus.edu',        role: 'admin',       zone: 'All Zones',      status: 'Active',   joined: '2024-12-01' },
  { id: 4, name: 'Meena Patel',    email: 'meena@campus.edu',       role: 'student',     zone: 'Canteen',        status: 'Active',   joined: '2025-02-14' },
  { id: 5, name: 'Ravi Singh',     email: 'ravi@campus.edu',        role: 'student',     zone: 'Library',        status: 'Inactive', joined: '2025-01-20' },
];

export const STATUS_FLOW = ['Reported', 'Under Review', 'Assigned to Staff', 'Cleaning in Progress', 'Resolved'];

export const STATUS_COLOR = {
  'Reported':             'badge-red',
  'Under Review':         'badge-yellow',
  'Assigned to Staff':    'badge-blue',
  'Cleaning in Progress': 'badge-purple',
  'Resolved':             'badge-green',
};

export const PRIORITY_COLOR = {
  'High':   'badge-red',
  'Medium': 'badge-yellow',
  'Low':    'badge-green',
};
