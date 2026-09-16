import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone') || '';
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();

    // Find business
    let bizId = '';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) {
      try { const s = await fb.getDoc(fb.doc(db, 'phone_lookup', clean)); if (s.exists()) bizId = s.data().bizId; } catch {}
    }
    if (!bizId) bizId = 'StsC7Ivcl7P8gR89Ljjxm7yTMO32';

    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ response: 'אני בודקת ומעדכנת.' });

    const bizData = bizSnap.data();
    const jobs = bizData.db?.jobs || [];
    const techs = (bizData.db?.users || []).filter((u: any) => u.role === 'tech' || u.role === 'technician');
    const techCount = Math.max(techs.length, 1);

    const now = new Date();
    const slots: string[] = [];
    const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      if (date.getDay() === 6) continue; // Skip Saturday
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const dayName = d === 0 ? 'היום' : d === 1 ? 'מחר' : 'יום ' + dayNames[date.getDay()];

      const dayJobs = jobs.filter((j: any) => j.scheduledDate === dateStr && j.status !== 'cancelled' && j.status !== 'completed');

      for (const hour of WORK_HOURS) {
        if (d === 0 && hour <= now.getHours()) continue; // Skip past hours today
        if (date.getDay() === 5 && hour > 13) continue; // Friday until 13:00

        const busyAtHour = dayJobs.filter((j: any) => {
          const h = parseInt((j.scheduledTime || j.time || '12:00').split(':')[0]);
          return h === hour;
        }).length;

        if (busyAtHour < techCount) {
          slots.push(`${dayName} ב-${hour}:00`);
        }

        if (slots.length >= 5) break;
      }
      if (slots.length >= 5) break;
    }

    let response = '';
    if (slots.length === 0) {
      response = 'השבוע קצת עמוס. אני רושמת ונתאם בהקדם.';
    } else if (slots.length === 1) {
      response = `יש לנו מקום ${slots[0]}. מתאים?`;
    } else {
      response = `יש לנו מקום ${slots[0]} או ${slots[1]}. מה עדיף?`;
    }

    return NextResponse.json({ response, available_slots: slots });
  } catch (e) {
    return NextResponse.json({ response: 'אני בודקת ומעדכנת.' });
  }
}
