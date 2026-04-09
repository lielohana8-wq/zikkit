export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

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
}
