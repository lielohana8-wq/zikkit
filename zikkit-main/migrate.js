/**
 * Zikkit Firestore Migration
 *
 * Copies all collections from old DB (us-central1) to new DB (me-west1 Tel Aviv).
 *
 * Usage:
 *   1. Place this file at C:\zikkit\migrate.js
 *   2. Place service account JSONs in Downloads folder
 *   3. Run: node migrate.js
 *
 * Safe: only reads from old, writes to new. Never deletes anything.
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ====================================================================
// CONFIG - Find your service account files automatically
// ====================================================================
const downloadsDir = path.join(os.homedir(), 'Downloads');
const files = fs.readdirSync(downloadsDir);

const oldKeyFile = files.find(f => f.startsWith('zikkit-5e554') && f.endsWith('.json'));
const newKeyFile = files.find(f => f.startsWith('zikkit-e87ff') && f.endsWith('.json'));

if (!oldKeyFile) {
  console.error('\n❌ ERROR: Could not find old DB key (zikkit-5e554-*.json) in Downloads folder.');
  console.error('   Expected path: ' + path.join(downloadsDir, 'zikkit-5e554-firebase-adminsdk-*.json'));
  process.exit(1);
}
if (!newKeyFile) {
  console.error('\n❌ ERROR: Could not find new DB key (zikkit-e87ff-*.json) in Downloads folder.');
  console.error('   Expected path: ' + path.join(downloadsDir, 'zikkit-e87ff-firebase-adminsdk-*.json'));
  process.exit(1);
}

console.log('\n📋 Found service account keys:');
console.log('   OLD DB:', oldKeyFile);
console.log('   NEW DB:', newKeyFile);

// ====================================================================
// INITIALIZE FIREBASE APPS
// ====================================================================
const oldKey = require(path.join(downloadsDir, oldKeyFile));
const newKey = require(path.join(downloadsDir, newKeyFile));

const oldApp = admin.initializeApp({
  credential: admin.credential.cert(oldKey),
  projectId: 'zikkit-5e554',
}, 'old');

const newApp = admin.initializeApp({
  credential: admin.credential.cert(newKey),
  projectId: 'zikkit-e87ff',
}, 'new');

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

// ====================================================================
// MIGRATION LOGIC
// ====================================================================
let totalDocs = 0;
let totalCollections = 0;

async function copyCollection(collectionRef, newCollectionRef, depth = 0) {
  const indent = '  '.repeat(depth);
  const collectionPath = collectionRef.path;
  console.log(`${indent}📂 ${collectionPath}`);

  const snapshot = await collectionRef.get();
  const batch = newDb.batch();
  let batchCount = 0;
  let docsInColl = 0;

  for (const doc of snapshot.docs) {
    const newDocRef = newCollectionRef.doc(doc.id);
    batch.set(newDocRef, doc.data());
    batchCount++;
    docsInColl++;
    totalDocs++;

    // Firestore batch limit is 500. Commit and start new batch.
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }

    // Copy subcollections recursively
    const subCollections = await doc.ref.listCollections();
    for (const subColl of subCollections) {
      const newSubRef = newDocRef.collection(subColl.id);
      await copyCollection(subColl, newSubRef, depth + 1);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`${indent}   ✓ ${docsInColl} documents copied`);
  totalCollections++;
}

// ====================================================================
// MAIN
// ====================================================================
async function main() {
  console.log('\n🚀 Starting migration...\n');
  console.log('   FROM: zikkit-5e554 (us-central1)');
  console.log('   TO:   zikkit-e87ff (me-west1 Tel Aviv)\n');

  const startTime = Date.now();

  try {
    const collections = await oldDb.listCollections();
    console.log(`📊 Found ${collections.length} top-level collections\n`);

    for (const coll of collections) {
      const newColl = newDb.collection(coll.id);
      await copyCollection(coll, newColl);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════════════');
    console.log(`   Collections: ${totalCollections}`);
    console.log(`   Documents:   ${totalDocs}`);
    console.log(`   Time:        ${elapsed}s`);
    console.log('══════════════════════════════════════════════════\n');
    console.log('🎉 Next step: Update Vercel env vars to point to zikkit-e87ff\n');

  } catch (e) {
    console.error('\n❌ MIGRATION FAILED:', e.message);
    console.error(e);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
