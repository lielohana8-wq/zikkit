import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    // Create Firebase Auth user via REST API
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          returnSecureToken: false,
        }),
      }
    );

    const authData = await authRes.json();

    if (authData.error) {
      const msg = authData.error.message;
      if (msg === 'EMAIL_EXISTS') {
        return NextResponse.json({ success: true, message: 'User already exists — tech_lookup will be created client-side' });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true, uid: authData.localId });
  } catch (e) {
    console.error('[Create User] Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
