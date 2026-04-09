import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, signedName, signatureData, clientIP } = body;

    if (!token || !signedName || !signatureData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const PROJECT_ID = 'zikkit-5e554';
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    // 1. Read the portal document
    const portalUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/public_portals/${token}?key=${API_KEY}`;
    const portalRes = await fetch(portalUrl);
    if (!portalRes.ok) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    const portalDoc = await portalRes.json();
    const bizId = portalDoc.fields?.bizId?.stringValue;

    if (!bizId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // 2. Update the portal document with signature
    const signaturePayload = {
      fields: {
        ...portalDoc.fields,
        signedAt: { stringValue: new Date().toISOString() },
        signedName: { stringValue: signedName },
        signedIP: { stringValue: clientIP || 'unknown' },
        signatureData: { stringValue: signatureData },
        status: { stringValue: 'signed' },
      },
    };

    await fetch(portalUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signaturePayload),
    });

    // 3. Also update the quote in the business document
    const bizUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?key=${API_KEY}`;
    const bizRes = await fetch(bizUrl);
    
    if (bizRes.ok) {
      const bizDoc = await bizRes.json();
      const dbField = bizDoc.fields?.db?.mapValue?.fields;
      
      if (dbField?.quotes?.arrayValue?.values) {
        const quotes = dbField.quotes.arrayValue.values;
        const quoteId = portalDoc.fields?.quote?.mapValue?.fields?.id?.integerValue;
        
        // Find and update the quote
        const updatedQuotes = quotes.map((q: Record<string, unknown>) => {
          const qFields = (q as Record<string, Record<string, unknown>>).mapValue?.fields;
          if (qFields && String(qFields.id?.integerValue || qFields.id?.stringValue) === String(quoteId)) {
            return {
              mapValue: {
                fields: {
                  ...qFields,
                  status: { stringValue: 'approved' },
                  signature: { stringValue: signatureData },
                  signedAt: { stringValue: new Date().toISOString() },
                  signedName: { stringValue: signedName },
                  signedIP: { stringValue: clientIP || 'unknown' },
                },
              },
            };
          }
          return q;
        });

        // Update business doc with signed quote
        const updateUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?updateMask.fieldPaths=db.quotes&key=${API_KEY}`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              db: {
                mapValue: {
                  fields: {
                    ...dbField,
                    quotes: { arrayValue: { values: updatedQuotes } },
                  },
                },
              },
            },
          }),
        });
      }
    }

    return NextResponse.json({ success: true, signedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Portal Sign] Error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
