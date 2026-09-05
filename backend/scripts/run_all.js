const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  'init_db.js',
  'migrate_v2.js',
  'migrate_v3.js',
  'migrate_v4.js',
  'migrate_v5.js',
  'migrate_gps.js',
  'migrate_notifications.js',
  'migrate_v6_state_hierarchy.js',
  'seed_demo_data.js'
];

console.log('🚀 Starting full database initialization sequence...');

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n▶️ Running ${script}...`);
  const result = spawnSync('node', [scriptPath], { stdio: 'inherit', env: process.env });
  
  if (result.status !== 0) {
    console.error(`❌ ${script} failed with status ${result.status}`);
    process.exit(1);
  }
}

console.log('\n✅ All database initialization scripts completed successfully!');
