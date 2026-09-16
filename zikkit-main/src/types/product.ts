export type ProductCategory = 'service' | 'part' | 'labor' | 'material' | 'other';

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  unit: string;
  price: number;
  cost: number;
  desc?: string;
  image?: string; // base64 data URL
}
