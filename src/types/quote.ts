export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'approved';

export interface QuoteItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  unit?: string;
}

export interface Quote {
  id: number;
  client: string;
  phone?: string;
  email?: string;
  address?: string;
  items: QuoteItem[];
  subtotal: number;
  tax?: number;
  total: number;
  status: QuoteStatus;
  created?: string;
  validUntil?: string;
  notes?: string;
  techId?: number;
  jobId?: number;
  signature?: string;
  portalToken?: string;
  // Solo edition fields
  number?: string;          // Q-1001
  customerId?: number;
  taxRate?: number;         // percent applied
  taxLabel?: string;        // HST
  discount?: number;        // absolute amount
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  signedName?: string;
  receiptId?: number;
  currency?: string;
  signedPdfUrl?: string;
  signatureToken?: string;
}
