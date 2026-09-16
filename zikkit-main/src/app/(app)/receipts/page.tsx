'use client';
import { Suspense } from 'react';
import SoloReceipts from '@/features/solo/pages/SoloReceipts';

export default function Page() {
  return <Suspense fallback={null}><SoloReceipts /></Suspense>;
}
