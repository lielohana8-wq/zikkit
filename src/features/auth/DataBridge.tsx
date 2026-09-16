'use client';

import { useEffect, type ReactNode } from 'react';
import { DataProvider, useData } from '@/hooks/useFirestore';
import { useAuth } from '@/features/auth/AuthProvider';
import { soloRoleOf } from '@/features/solo/roles';

/**
 * The ONE DataProvider of the app. Wires the authenticated business (and the
 * user's role, so technicians get a scoped view) into the data layer.
 */
function BizIdSync({ children }: { children: ReactNode }) {
  const { bizId: authBizId, user, firebaseUser } = useAuth();
  const { setBizId, setScope } = useData();

  useEffect(() => {
    setScope({ role: soloRoleOf(user), uid: firebaseUser?.uid || null });
    if (authBizId) setBizId(authBizId);
  }, [authBizId, user, firebaseUser?.uid, setBizId, setScope]);

  return <>{children}</>;
}

export function DataBridge({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <BizIdSync>{children}</BizIdSync>
    </DataProvider>
  );
}
