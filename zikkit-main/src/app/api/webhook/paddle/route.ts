import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreDb, doc, setDoc } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.event_type;
    const data = body.data;

    const db = getFirestoreDb();

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated': {
        const bizId = data.custom_data?.bizId;
        if (!bizId) break;
        await setDoc(doc(db, 'businesses', bizId), {
          cfg: {
            plan: data.items?.[0]?.price?.id === 'pri_unlimited' ? 'unlimited' : 'starter',
            plan_status: 'active',
            paddle_subscription_id: data.id,
            paddle_customer_id: data.customer_id,
            plan_started_at: new Date().toISOString(),
          }
        }, { merge: true });
        break;
      }
      case 'subscription.canceled': {
        const bizId = data.custom_data?.bizId;
        if (!bizId) break;
        await setDoc(doc(db, 'businesses', bizId), {
          cfg: {
            plan_status: 'canceled',
            plan_canceled_at: new Date().toISOString(),
          }
        }, { merge: true });
        break;
      }
      case 'subscription.past_due': {
        const bizId = data.custom_data?.bizId;
        if (!bizId) break;
        await setDoc(doc(db, 'businesses', bizId), {
          cfg: { plan_status: 'past_due' }
        }, { merge: true });
        break;
      }
      case 'transaction.completed': {
        const bizId = data.custom_data?.bizId;
        if (!bizId) break;
        await setDoc(doc(db, 'businesses', bizId), {
          cfg: { last_payment_at: new Date().toISOString() }
        }, { merge: true });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[Paddle Webhook] Error:', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
