import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * firebase-admin singleton for API routes.
 *
 * Replaces the hand-rolled REST + JWT-signing helpers that were copy-pasted
 * into a dozen routes (some with a hardcoded project id of a DIFFERENT
 * deployment). Credentials come from FIREBASE_SERVICE_ACCOUNT_KEY (the JSON of
 * a service account) — the same variable those routes already expected.
 */
let app: App | null = null;

export function adminApp(): App {
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
  let sa: { project_id?: string; client_email: string; private_key: string };
  try { sa = JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON'); }
  if (projectId && sa.project_id && sa.project_id !== projectId) {
    throw new Error(`Service account project (${sa.project_id}) does not match NEXT_PUBLIC_FIREBASE_PROJECT_ID (${projectId})`);
  }
  app = initializeApp({ credential: cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, '\n') }) });
  return app;
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}
