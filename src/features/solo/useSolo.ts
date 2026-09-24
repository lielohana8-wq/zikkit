'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { newId } from '@/lib/data/collections';
import { REGION, REGION_DEFAULTS, getBaseUrl, normalizePhone } from '@/lib/region';
import type { Customer, Receipt, Closing, Quote, QuoteItem, ReceiptItem, BusinessConfig, Job, User, Product, Lead, ReviewRequest } from '@/types';
import { soloRoleOf } from './roles';
import { splitDefaults, sourceRatesFrom } from './split';

export type DocKind = 'quote' | 'receipt';

/** Someone a job can be assigned to. */
export interface Assignee {
  /** Stable handle used on the job: the person's Firebase uid once they sign in, otherwise `member:<id>`. */
  key: string;
  /** Firebase uid — empty until they accept their invite. */
  uid: string;
  /** Row id in the team list (absent for the owner). */
  memberId?: number;
  pending?: boolean;
  name: string;
  role: 'owner' | 'partner' | 'dispatcher' | 'technician';
  color?: string;
  phone?: string;
  email?: string;
  /** True when this is the signed-in user. */
  isMe: boolean;
}

export function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

export function computeTotals(items: Array<{ qty: number; price: number }>, discount = 0, taxRate = 0) {
  const subtotal = round2(items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0));
  const taxable = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = round2(taxable * ((Number(taxRate) || 0) / 100));
  const total = round2(taxable + tax);
  return { subtotal, tax, total };
}

/** Monday → Sunday week containing `d` (local time). */
export function weekRange(d: Date): { start: Date; end: Date } {
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const day = (start.getDay() + 6) % 7; // Mon=0 … Sun=6
  start.setDate(start.getDate() - day);
  const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function randomToken(len = 20): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function docNumber(cfg: BusinessConfig, kind: DocKind, n: number): string {
  const prefix = kind === 'quote' ? (cfg.quote_prefix || 'Q') : (cfg.receipt_prefix || 'R');
  return `${prefix}-${n}`;
}

export function useSolo() {
  const data = useData();
  const { bizId, user, firebaseUser } = useAuth();
  const { db, cfg, saveItem, deleteItem, nextNumber } = data;
  const role = soloRoleOf(user);
  const uid = firebaseUser?.uid || null;

  const customers = useMemo(() => ((db.customers || []) as Customer[]).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')), [db.customers]);
  const quotes = useMemo(() => ((db.quotes || []) as Quote[]).slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')), [db.quotes]);
  const receipts = useMemo(() => ((db.receipts || []) as Receipt[]).slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')), [db.receipts]);
  const closings = useMemo(() => ((db.closings || []) as Closing[]).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || '').localeCompare(a.created || '')), [db.closings]);
  const jobs = useMemo(() => ((db.jobs || []) as Job[]).slice().sort((a, b) => `${a.scheduledDate || ''} ${a.scheduledTime || ''}`.localeCompare(`${b.scheduledDate || ''} ${b.scheduledTime || ''}`)), [db.jobs]);
  /** Team members (everyone in `users` except the owner). Technicians never see this (scoped provider). */
  const team = useMemo(() => ((db.users || []) as User[]).filter((u) => u.role !== 'owner' && u.role !== 'super_admin'), [db.users]);
  const technicians = useMemo(() => team.filter((u) => (u.role === 'technician' || u.role === 'tech') && u.active !== false), [team]);

  /**
   * Everyone a job can be given to — the owner included. The owner has no row in
   * `users`, but their Firebase uid IS the business id, so that is their handle.
   * Work done by the owner or a partner belongs to the company; technician work
   * is simply tagged to that person.
   */
  const assignees = useMemo(() => {
    const ownerRecord = ((db.users || []) as User[]).find((u) => u.role === 'owner' || u.role === 'super_admin');
    /**
     * Signing in writes `businesses/{bizId}/members/{uid}`, but the team row in
     * `users` keeps no uid of its own — so the link between "Barak on the team"
     * and "the account Barak logged in with" is made here, by email.
     */
    const memberDocs = ((db.members || []) as Array<{ uid?: string; email?: string }>);
    const uidByEmail = new Map<string, string>();
    for (const m of memberDocs) if (m.uid && m.email) uidByEmail.set(String(m.email).toLowerCase(), m.uid);
    const out: Assignee[] = [];
    if (bizId) {
      const mine = uid === bizId;
      out.push({
        key: bizId, uid: bizId, role: 'owner', isMe: mine,
        name: ownerRecord?.name || (mine && user?.name) || cfg.biz_name || 'Owner',
        phone: ownerRecord?.phone || cfg.biz_phone, email: ownerRecord?.email || cfg.biz_email,
      });
    }
    for (const t of team) {
      if (t.active === false) continue;
      const r = t.role === 'partner' ? 'partner' : t.role === 'dispatcher' ? 'dispatcher' : 'technician';
      const memberUid = t.uid || uidByEmail.get((t.email || '').toLowerCase()) || '';
      // Someone who hasn't signed in yet is still schedulable — the job holds
      // `member:<id>` until they do, then it is swapped for their uid.
      out.push({
        key: memberUid || `member:${t.id}`, uid: memberUid, memberId: Number(t.id), pending: !memberUid,
        role: r, name: t.name, color: t.color, phone: t.phone, email: t.email, isMe: Boolean(memberUid) && memberUid === uid,
      });
    }
    return out;
  }, [team, db.users, db.members, bizId, uid, user?.name, cfg.biz_name, cfg.biz_phone, cfg.biz_email]);

  const assigneeOf = useCallback((key?: string | null) => (key ? assignees.find((a) => a.key === key || (a.uid && a.uid === key)) : undefined), [assignees]);
  const products = useMemo(() => ((db.products || []) as Product[]).slice().sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')), [db.products]);
  const leads = useMemo(() => ((db.leads || []) as Lead[]).slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')), [db.leads]);
  const reviews = useMemo(() => ((db.reviews || []) as ReviewRequest[]).slice().sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || '')), [db.reviews]);
  const presence = useMemo(() => ((db.presence || []) as Array<{ uid: string; name?: string; email?: string; isActive?: boolean; updated?: string; lastGps?: { lat: number; lng: number; ts: string; accuracy?: number } }>), [db.presence]);

  /**
   * Money/tax follow THIS deployment's region, not a config left over from
   * another one. An account created in the Israeli app carries ILS + Israeli
   * VAT; opening it in the Canadian app must never price work in ₪.
   * Only a config that explicitly belongs to this region is trusted.
   */
  const cfgMatchesRegion = cfg.region === REGION;
  const currency = (cfgMatchesRegion && cfg.currency) || REGION_DEFAULTS.currency;
  const taxRate = cfgMatchesRegion && cfg.tax_rate != null ? cfg.tax_rate : REGION_DEFAULTS.taxRate;
  const taxLabel = (cfgMatchesRegion && cfg.tax_label) || REGION_DEFAULTS.taxLabel;
  /** True when this business was set up for a different region — Settings shows a fix-it banner. */
  const regionMismatch = Boolean(cfg.region) && !cfgMatchesRegion;

  const customerById = useCallback((id?: number) => (id == null ? undefined : customers.find((c) => c.id === id)), [customers]);

  /** Revenue-split defaults and the list of companies we take work from. */
  const defaults = useMemo(() => splitDefaults(cfg), [cfg]);
  const sourceRates = useMemo(() => sourceRatesFrom(cfg, closings, jobs), [cfg, closings, jobs]);
  const sources = useMemo(() => sourceRates.map((r) => r.name), [sourceRates]);

  const upsertCustomer = useCallback(async (c: Partial<Customer> & { name: string }): Promise<Customer> => {
    const now = new Date().toISOString();
    const existing = c.id != null ? customers.find((x) => x.id === c.id) : undefined;
    const record: Customer = {
      ...(existing || { id: newId(), created: now }),
      ...c,
      id: existing?.id ?? c.id ?? newId(),
      phone: c.phone != null ? normalizePhone(c.phone) : existing?.phone,
      updated: now,
      created: existing?.created || now,
    } as Customer;
    await saveItem('customers', record as unknown as Record<string, unknown>);
    return record;
  }, [customers, saveItem]);

  /** Find or create a customer from a name/phone typed into a document. */
  const ensureCustomer = useCallback(async (name: string, phone?: string, email?: string, address?: string): Promise<Customer | null> => {
    const n = (name || '').trim(); if (!n) return null;
    const p = phone ? normalizePhone(phone) : '';
    const found = customers.find((c) => (p && c.phone === p) || c.name.trim().toLowerCase() === n.toLowerCase());
    if (found) return found;
    return upsertCustomer({ name: n, phone: p || undefined, email: email || undefined, address: address || undefined, source: 'document' });
  }, [customers, upsertCustomer]);

  const saveQuote = useCallback(async (q: Quote) => saveItem('quotes', q as unknown as Record<string, unknown>), [saveItem]);
  const saveReceipt = useCallback(async (r: Receipt) => saveItem('receipts', r as unknown as Record<string, unknown>), [saveItem]);
  const saveClosing = useCallback(async (c: Closing) => saveItem('closings', c as unknown as Record<string, unknown>), [saveItem]);
  const saveJob = useCallback(async (j: Job) => saveItem('jobs', j as unknown as Record<string, unknown>), [saveItem]);

  /**
   * A job scheduled before its person accepted the invite holds `member:<id>`.
   * Once they sign in they get a real uid — swap it in so the job reaches their
   * phone (their view is scoped to `techUid == uid`). Runs on staff clients only.
   */
  const backfilling = useRef(false);
  useEffect(() => {
    if (backfilling.current || role === 'technician' || role === 'partner') return;
    const pending = jobs.filter((j) => typeof j.techUid === 'string' && j.techUid.startsWith('member:'));
    if (pending.length === 0) return;
    const fixes = pending
      .map((j) => ({ job: j, who: assignees.find((a) => a.key === j.techUid || (a.memberId != null && `member:${a.memberId}` === j.techUid)) }))
      .filter((x) => x.who?.uid);
    if (fixes.length === 0) return;
    backfilling.current = true;
    (async () => {
      try {
        for (const { job, who } of fixes) await saveItem('jobs', { ...job, techUid: who!.uid, tech: who!.name, assigneeId: who!.memberId } as unknown as Record<string, unknown>);
      } catch { /* retried on the next load */ }
      finally { backfilling.current = false; }
    })();
  }, [jobs, assignees, role, saveItem]);
  const saveMember = useCallback(async (u: User) => saveItem('users', u as unknown as Record<string, unknown>), [saveItem]);
  const saveProduct = useCallback(async (p: Product) => saveItem('products', p as unknown as Record<string, unknown>), [saveItem]);
  const saveLead = useCallback(async (l: Lead) => saveItem('leads', l as unknown as Record<string, unknown>), [saveItem]);
  const saveReview = useCallback(async (r: ReviewRequest) => saveItem('reviews', r as unknown as Record<string, unknown>), [saveItem]);

  /** Publish a customer-facing snapshot to public_portals and return the link. Re-uses the token on re-send. */
  const publish = useCallback(async (kind: DocKind, record: Quote | Receipt): Promise<{ token: string; url: string }> => {
    const token = record.portalToken || `${kind === 'quote' ? 'q' : 'r'}_${record.id}_${randomToken()}`;
    const firestore = getFirestoreDb();
    await setDoc(doc(firestore, 'public_portals', token), {
      kind, bizId: bizId || '',
      biz: {
        name: cfg.biz_name || 'Business', phone: cfg.biz_phone || '', email: cfg.biz_email || '',
        address: [cfg.biz_address, cfg.biz_city, cfg.biz_province, cfg.biz_postal].filter(Boolean).join(', '),
        // Storage URL when the upload worked; otherwise the (small, resized) inline image so the logo never goes missing
        logo: [cfg.logo_url, cfg.biz_logo].find((l) => l && (!String(l).startsWith('data:') || String(l).length < 300_000)) || '',
        color: cfg.biz_color || '#4F46E5', website: cfg.biz_website || '', taxNumber: cfg.tax_number || '',
        taxLabel, paymentInstructions: cfg.payment_instructions || '',
        footer: kind === 'quote' ? (cfg.quote_footer || '') : (cfg.receipt_footer || ''),
      },
      doc: JSON.parse(JSON.stringify({ ...record, signature: undefined, portalToken: undefined })),
      currency, locale: REGION_DEFAULTS.locale,
      status: kind === 'quote' ? ((record as Quote).status || 'sent') : (record as Receipt).status,
      updated: new Date().toISOString(),
      created: new Date().toISOString(),
    }, { merge: true });
    const path = kind === 'quote' ? '/q/' : '/r/';
    return { token, url: `${getBaseUrl()}${path}${token}` };
  }, [bizId, cfg, currency, taxLabel]);

  const nextDocNumber = useCallback(async (kind: DocKind): Promise<string> => {
    const start = Number(cfg.numbering_start) || 1000;
    const n = await nextNumber(kind, start);
    return docNumber(cfg, kind, n);
  }, [cfg, nextNumber]);

  const receiptFromQuote = useCallback((q: Quote, number: string): Receipt => {
    const items: ReceiptItem[] = (q.items || []).map((it: QuoteItem) => ({ id: it.id, name: it.name, qty: it.qty, price: it.price }));
    const t = computeTotals(items, q.discount || 0, q.taxRate ?? taxRate);
    return {
      id: newId(), number, customerId: q.customerId, client: q.client, phone: q.phone, email: q.email, address: q.address,
      items, subtotal: t.subtotal, discount: q.discount || 0, taxRate: q.taxRate ?? taxRate, taxLabel: q.taxLabel || taxLabel,
      tax: t.tax, total: t.total, amountPaid: 0, balance: t.total, status: 'unpaid', quoteId: q.id, currency,
      notes: q.notes || '', created: new Date().toISOString(),
    };
  }, [taxRate, taxLabel, currency]);

  return {
    ...data, bizId, user, uid, role, customers, quotes, receipts, closings, jobs, team, technicians,
    products, leads, reviews, presence, sources, sourceRates, defaults, assignees, assigneeOf,
    saveJob, saveMember, saveProduct, saveLead, saveReview, currency, taxRate, taxLabel, regionMismatch,
    customerById, upsertCustomer, ensureCustomer, saveQuote, saveReceipt, saveClosing, deleteItem,
    publish, nextDocNumber, receiptFromQuote,
  };
}
