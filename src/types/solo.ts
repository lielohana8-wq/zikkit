/** Solo edition — Customers / Receipts / Closings. Quotes reuse `Quote` (see quote.ts). */

export interface Customer {
  id: number;
  name: string;
  phone?: string;       // E.164
  email?: string;
  address?: string;     // street
  city?: string;
  province?: string;
  postal?: string;
  notes?: string;
  tags?: string[];
  source?: string;      // referral, google, repeat…
  created: string;      // ISO
  updated?: string;
}

export type PaymentMethod = 'cash' | 'etransfer' | 'credit' | 'debit' | 'cheque' | 'other';
export type ReceiptStatus = 'paid' | 'partial' | 'unpaid' | 'refunded';

export interface ReceiptItem { id: number; name: string; qty: number; price: number; }

export interface Receipt {
  id: number;
  number: string;        // R-1001
  customerId?: number;
  client: string;
  phone?: string;
  email?: string;
  address?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  taxRate?: number;
  taxLabel?: string;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: ReceiptStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  notes?: string;
  quoteId?: number;
  closingId?: number;
  currency?: string;
  portalToken?: string;
  created: string;
}

/** Where a payment physically went — the closing log tracks money, not commission. */
export type PaidTo = 'company' | 'cash' | 'me' | 'none';

export interface Closing {
  id: number;
  date: string;           // YYYY-MM-DD (local)
  customerId?: number;
  client: string;
  phone?: string;
  address?: string;
  jobType: string;        // e.g. Chimney sweep, Garage door spring
  amount: number;         // total closed
  deposit?: number;
  depositPaidTo?: PaidTo;
  balance?: number;
  balancePaidTo?: PaidTo;
  paymentMethod?: PaymentMethod;
  materials?: number;     // optional raw cost, no commission math here
  notes?: string;
  quoteId?: number;
  receiptId?: number;
  jobId?: number;
  techUid?: string;       // who closed it (rules scope on this)
  techName?: string;
  photos?: string[];
  createdBy?: string;
  status?: 'open' | 'done';
  created: string;
}

export type SoloRole = 'owner' | 'partner' | 'dispatcher' | 'technician';

export interface Invite {
  token: string;
  bizId: string;
  bizName: string;
  email: string;
  name: string;
  role: SoloRole;
  created: string;
  status: 'pending' | 'accepted' | 'revoked';
  acceptedUid?: string;
  acceptedAt?: string;
}
