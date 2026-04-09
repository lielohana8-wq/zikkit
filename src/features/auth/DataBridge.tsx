'use client';

import { useEffect, type ReactNode } from 'react';
import { DataProvider, useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';

function BizIdSync({ children }: { children: ReactNode }) {
  const { bizId: authBizId } = useAuth();
  const { setBizId, syncFromCloud } = useData();

  useEffect(() => {
    if (authBizId) {
      setBizId(authBizId);
      syncFromCloud();
    }
  }, [authBizId, setBizId, syncFromCloud]);

  return <>{children}</>;
}

export function DataBridge({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <BizIdSync>{children}</BizIdSync>
    </DataProvider>
  );
}
