#!/usr/bin/env node
/**
 * ZIKKIT RESCUE — inspect and restore business data.
 *
 * Nothing here deletes anything. It reads what is actually in Firestore and,
 * on request, rebuilds the legacy inline `db` object that the OLD (Israeli)
 * client reads — either from the per-record subcollections written by the new
 * data layer, or from the one-time backup it takes before migrating
 * (businesses/{bizId}/backups/legacy-*).
 *
 * Usage (from C:\zikkit, with FIREBASE_SERVICE_ACCOUNT_KEY in .env.local):
 *   node tools/zikkit-rescue.js list
 *   node tools/zikkit-rescue.js inspect <bizId>
 *   node tools/zikkit-rescue.js restore <bizId> --from=backup        (safest)
 *   node tools/zikkit-rescue.js restore <bizId> --from=subcollections
 *
 * Every restore first saves the current state to
 * businesses/{bizId}/backups/rescue-<timestamp>.
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
    }
  }
}
loadEnv();

const admin = require('firebase-admin');
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env.local — add it and run again.'); process.exit(1); }
const sa = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: String(sa.private_key).replace(/\\n/g, '\n') }) });
const db = admin.firestore();

const KNOWN = ['users', 'leads', 'jobs', 'quotes', 'products', 'botLog', 'expenses', 'payments', 'reviews', 'inventory', 'photoSets', 'whatsapp', 'waTemplates', 'membership', 'memberPlans', 'memberSubs', 'support', 'tickets', 'customers', 'receipts', 'closings'];
const RESERVED = new Set(['members', 'counters', 'presence', 'backups', 'meta']);
const counts = (obj) => Object.entries(obj || {}).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}:${v.length}`).filter((s) => !s.endsWith(':0')).join(' ') || '(empty)';

async function list() {
  const snap = await db.collection('businesses').get();
  console.log(`\n${snap.size} businesses in project ${sa.project_id}\n`);
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const inline = d.db || {};
    const total = Object.values(inline).filter(Array.isArray).reduce((s, a) => s + a.length, 0);
    const backups = await doc.ref.collection('backups').limit(5).get();
    console.log(`${doc.id}  ${(d.cfg?.biz_name || '(no name)').padEnd(28)} region=${d.cfg?.region || '?'}  inline=${total}  backups=${backups.size}`);
  }
  console.log('\nRun: node tools/zikkit-rescue.js inspect <bizId>\n');
}

async function inspect(bizId) {
  const ref = db.collection('businesses').doc(bizId);
  const snap = await ref.get();
  if (!snap.exists) { console.error('No such business:', bizId); process.exit(1); }
  const d = snap.data() || {};
  console.log(`\nBusiness ${bizId} — ${d.cfg?.biz_name || '(no name)'}\n`);
  console.log('  inline db.*      :', counts(d.db));
  const subs = await ref.listCollections();
  const parts = [];
  for (const col of subs) {
    if (RESERVED.has(col.id)) continue;
    const c = await col.count().get();
    if (c.data().count) parts.push(`${col.id}:${c.data().count}`);
  }
  console.log('  subcollections   :', parts.join(' ') || '(none)');
  const backups = await ref.collection('backups').orderBy('created', 'desc').limit(10).get();
  console.log('  backups          :', backups.empty ? '(none)' : '');
  backups.forEach((b) => console.log(`     ${b.id}   ${counts(b.data().db)}`));
  console.log('\nRestore: node tools/zikkit-rescue.js restore ' + bizId + ' --from=backup\n');
}

async function restore(bizId, from) {
  const ref = db.collection('businesses').doc(bizId);
  const snap = await ref.get();
  if (!snap.exists) { console.error('No such business:', bizId); process.exit(1); }
  const current = snap.data() || {};

  let nextDb = {};
  if (from === 'backup') {
    const backups = await ref.collection('backups').orderBy('created', 'desc').limit(20).get();
    const legacy = backups.docs.filter((b) => b.id.startsWith('legacy-'));
    const pick = legacy[0] || backups.docs[0];
    if (!pick) { console.error('No backup found for this business. Try --from=subcollections'); process.exit(1); }
    console.log('Using backup:', pick.id);
    nextDb = pick.data().db || {};
  } else {
    const cols = await ref.listCollections();
    for (const col of cols) {
      if (RESERVED.has(col.id)) continue;
      const docs = await col.get();
      if (docs.empty) continue;
      nextDb[col.id] = docs.docs.map((x) => x.data()).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }
  }
  for (const k of KNOWN) if (!Array.isArray(nextDb[k])) nextDb[k] = nextDb[k] || [];

  // merge: never lose records that only exist inline right now
  const inline = current.db || {};
  for (const [k, arr] of Object.entries(inline)) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const have = new Set((nextDb[k] || []).map((x) => String(x && x.id)));
    nextDb[k] = [...(nextDb[k] || []), ...arr.filter((x) => !have.has(String(x && x.id)))];
  }

  const stamp = 'rescue-' + new Date().toISOString().replace(/[:.]/g, '-');
  await ref.collection('backups').doc(stamp).set({ db: inline, cfg: current.cfg || {}, created: new Date().toISOString(), note: 'state before rescue restore' });
  console.log('Saved current state to backups/' + stamp);

  const json = JSON.stringify({ db: nextDb }).length;
  console.log('Restoring:', counts(nextDb), `(${Math.round(json / 1024)} KB)`);
  if (json > 950_000) { console.error('\nThis exceeds the 1 MB Firestore document limit — the old single-document model cannot hold it. Keep using the new client, or drop photo data first.'); process.exit(1); }
  await ref.set({ db: nextDb }, { merge: true });
  console.log('\nDone. Tell the user to reload the app (Ctrl+F5) and clear the site data if it still looks empty.\n');
}

const [cmd, arg, ...rest] = process.argv.slice(2);
const fromFlag = (rest.find((r) => r.startsWith('--from=')) || '--from=backup').split('=')[1];
(async () => {
  if (cmd === 'list') return list();
  if (cmd === 'inspect' && arg) return inspect(arg);
  if (cmd === 'restore' && arg) return restore(arg, fromFlag);
  console.log('Usage:\n  node tools/zikkit-rescue.js list\n  node tools/zikkit-rescue.js inspect <bizId>\n  node tools/zikkit-rescue.js restore <bizId> --from=backup|subcollections');
})().then(() => process.exit(0)).catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
