import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const bizId = req.nextUrl.searchParams.get('bizId') || 'StsC7Ivcl7P8gR89Ljjxm7yTMO32';

    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();
    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const bizData = bizSnap.data();
    const jobs = bizData.db?.jobs || [];
    const techs = (bizData.db?.users || []).filter((u: any) => u.role === 'tech' || u.role === 'technician');

    // Get next 7 days
    const slots: any[] = [];
    const now = new Date();

    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][date.getDay()];

      // Skip Saturday
      if (date.getDay() === 6) continue;

      // Count jobs per time slot
      const dayJobs = jobs.filter((j: any) => j.scheduledDate === dateStr && j.status !== 'cancelled' && j.status !== 'completed');

      const morning = dayJobs.filter((j: any) => {
        const h = parseInt((j.scheduledTime || j.time || '12:00').split(':')[0]);
        return h < 12;
      }).length;

      const afternoon = dayJobs.filter((j: any) => {
        const h = parseInt((j.scheduledTime || j.time || '12:00').split(':')[0]);
        return h >= 12;
      }).length;

      const techCount = Math.max(techs.length, 1);

      slots.push({
        date: dateStr,
        day: dayName,
        isToday: d === 0,
        isTomorrow: d === 1,
        morning: { jobs: morning, available: morning < techCount, spots: techCount - morning },
        afternoon: { jobs: afternoon, available: afternoon < techCount, spots: techCount - afternoon },
      });
    }

    // Build natural language response
    let response = '';
    const available = slots.filter(s => s.morning.available || s.afternoon.available);

    if (available.length === 0) {
      response = 'השבוע הזה מלא. אפשר לתאם לשבוע הבא.';
    } else {
      const first = available[0];
      if (first.isToday) {
        if (first.afternoon.available) response = 'יש לנו מקום היום אחרי הצהריים.';
        else if (first.morning.available) response = 'יש לנו מקום היום בבוקר.';
      } else if (first.isTomorrow) {
        if (first.morning.available && first.afternoon.available) response = 'מחר יש מקום גם בבוקר וגם אחהצ.';
        else if (first.morning.available) response = 'מחר בבוקר יש מקום.';
        else response = 'מחר אחהצ יש מקום.';
      } else {
        response = `הזמן הפנוי הקרוב ביותר הוא יום ${first.day}. ${first.morning.available ? 'בבוקר' : 'אחהצ'}.`;
      }
    }

    return NextResponse.json({ response, slots, techCount: techs.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
