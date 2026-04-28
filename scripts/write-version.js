// Run before each Firebase deploy via the predeploy hook in firebase.json.
// Writes version.json containing a deploy timestamp; pages poll this file
// to detect new versions and prompt the user to refresh all open tabs.
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '..', 'version.json');
fs.writeFileSync(out, JSON.stringify({ v: Date.now() }));
console.log('wrote', out);
