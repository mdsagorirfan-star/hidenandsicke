import fs from 'node:fs';
import assert from 'node:assert/strict';

const rules = fs.readFileSync('firestore.rules', 'utf8');

// Verify mandatory security invariants in firestore.rules
assert.match(rules, /rules_version = '2';/, 'Must use rules_version 2');
assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/, 'Must start with default-deny catch-all');
assert.match(rules, /function isValidId\(id\)/, 'Must define isValidId');
assert.match(rules, /request\.auth\.token\.email_verified == true/, 'Must enforce verified email');
assert.match(rules, /jjjj91551jjjj@gmail\.com/, 'Must include bootstrapped admin email');

// Ensure every blueprint collection has a match block
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));
for (const pathKey of Object.keys(blueprint.firestore)) {
  const collectionName = pathKey.split('/')[1];
  assert.ok(rules.includes(`match /${collectionName}/`), `Missing match block for ${collectionName}`);
}

console.log('Firestore rules structural & blueprint verification passed.');
