import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env.local');

// GET — read current keys (masked)
export async function GET() {
  try {
    const content = await readFile(ENV_PATH, 'utf-8');
    const keys: Record<string, string> = {};
    content.split('\n').forEach(line => {
      if (line.startsWith('#') || !line.includes('=')) return;
      const [key, ...val] = line.split('=');
      const value = val.join('=').trim();
      // Mask values — show only last 4 chars
      keys[key.trim()] = value ? ('•'.repeat(Math.max(value.length - 4, 0)) + value.slice(-4)) : '';
    });
    return NextResponse.json({ keys });
  } catch {
    return NextResponse.json({ keys: {} });
  }
}

// POST — update keys
export async function POST(req: NextRequest) {
  try {
    const { updates } = await req.json();
    
    // Read existing
    let existing: Record<string, string> = {};
    try {
      const content = await readFile(ENV_PATH, 'utf-8');
      content.split('\n').forEach(line => {
        if (line.startsWith('#') || !line.includes('=')) return;
        const [key, ...val] = line.split('=');
        existing[key.trim()] = val.join('=').trim();
      });
    } catch {}

    // Merge updates (only update non-empty values)
    for (const [key, value] of Object.entries(updates as Record<string, string>)) {
      if (value && value.trim() && !value.includes('•')) {
        existing[key] = value.trim();
      }
    }

    // Write back
    const lines = [
      '# ZIKKIT Environment Variables',
      '# Updated via Admin Console',
      '',
      '# AI Voice Bot',
      `ANTHROPIC_API_KEY=${existing['ANTHROPIC_API_KEY'] || ''}`,
      '',
      '# Twilio Phone Calls',
      `TWILIO_ACCOUNT_SID=${existing['TWILIO_ACCOUNT_SID'] || ''}`,
      `TWILIO_AUTH_TOKEN=${existing['TWILIO_AUTH_TOKEN'] || ''}`,
      `TWILIO_PHONE_NUMBER=${existing['TWILIO_PHONE_NUMBER'] || ''}`,
      '',
      '# Resend Email',
      `RESEND_API_KEY=${existing['RESEND_API_KEY'] || ''}`,
      `RESEND_FROM_EMAIL=${existing['RESEND_FROM_EMAIL'] || ''}`,
      '',
      '# Public URL (ngrok for localhost)',
      `NEXT_PUBLIC_BASE_URL=${existing['NEXT_PUBLIC_BASE_URL'] || ''}`,
      '',
    ];

    await writeFile(ENV_PATH, lines.join('\n'));
    return NextResponse.json({ success: true, message: 'Keys updated. Restart server (npm run dev) for changes to take effect.' });
  } catch (e) {
    return NextResponse.json({ success: false, message: (e as Error).message }, { status: 500 });
  }
}
