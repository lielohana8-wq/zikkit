'use client';
export default function PilotAgreementPage() {
  return (
    <div style={{ background: '#07090b', minHeight: '100vh', padding: 20, direction: 'rtl', fontFamily: 'Inter, sans-serif', color: '#e8f0f4' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }} className="no-print">
        <button onClick={() => window.print()} style={{ padding: '10px 30px', background: '#00e5b0', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>🖨️ הדפס / שמור כ-PDF</button>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#0f1318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 50 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'inline-flex', width: 60, height: 60, background: '#00e5b0', borderRadius: 14, alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#000' }}>Zk</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', color: '#00e5b0', marginBottom: 6 }}>הסכם פיילוט חינם</h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#5a7080', marginBottom: 40 }}>הסכם סודיות, אי-העתקה ושימוש במערכת Zikkit</p>

        {[
          { t: '1. הצדדים', c: <><p><strong>&quot;החברה&quot;</strong> — Zikkit (ליאל אוחנה), מפתח ומפעיל מערכת Zikkit לניהול עסקי שדה.</p><p><strong>&quot;הלקוח&quot;</strong> — _____________________________ (שם מלא), בעל העסק _____________________________ (שם העסק),</p><p>טלפון: _________________ מייל: _________________________________</p></> },
          { t: '2. מהות ההסכם', c: <p>החברה מעניקה ללקוח גישה חינמית למערכת Zikkit לתקופת פיילוט בת <strong>חודש אחד (30 יום)</strong> מיום החתימה. מטרת הפיילוט היא הערכה הדדית של המערכת, קבלת משוב, ובחינת התאמה לצרכי העסק.</p> },
          { t: '3. מה הלקוח מקבל', c: <ul><li>גישה מלאה למערכת Zikkit כולל כל הפיצ&apos;רים</li><li>הפעלת בוט AI קולי עם מספר טלפון ייעודי</li><li>פורטל לקוח ממותג</li><li>תמיכה טכנית בהקמה</li><li>ללא עלות לתקופת הפיילוט</li></ul> },
          { t: '4. סודיות ואי-גילוי (NDA)', c: <><div style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '12px 0' }}><p style={{ color: '#00e5b0', fontWeight: 600 }}>⚠️ סעיף זה מחייב גם לאחר סיום ההסכם — ללא הגבלת זמן.</p></div><p>הלקוח מתחייב:</p><ol><li><strong>לא לגלות</strong> מידע טכני, עיצובי, או עסקי אודות Zikkit לצד שלישי.</li><li><strong>לא להעתיק</strong> את הקוד, העיצוב, הממשק, הלוגיקה, או כל חלק מהם.</li><li><strong>לא לפתח</strong> מוצר מתחרה המבוסס על ידע שנחשף דרך Zikkit.</li><li><strong>לא לשתף</strong> פרטי גישה עם מי שאינו מורשה.</li><li><strong>לא לצלם</strong> מסכים, לבצע הנדסה הפוכה, או לחלץ קוד מקור.</li><li><strong>לשמור בסודיות</strong> את תנאי ההסכם, התמחור והפיילוט.</li></ol></> },
          { t: '5. קניין רוחני', c: <p>כל הזכויות במערכת Zikkit שייכים באופן בלעדי לחברה. הפיילוט אינו מעניק ללקוח שום זכות קניין רוחני, רישיון צמיתי, או בעלות.</p> },
          { t: '6. נתוני הלקוח', c: <p>הנתונים שהלקוח מזין שייכים ללקוח. בסיום הפיילוט הלקוח יכול לבקש ייצוא. החברה מתחייבת לא להשתמש בנתוני הלקוח למטרות שיווקיות ללא אישור.</p> },
          { t: '7. תקופה וסיום', c: <ul><li>הפיילוט תקף ל-<strong>30 יום</strong> מיום החתימה.</li><li>בתום התקופה: המשך בתשלום או סיום.</li><li>כל צד יכול לסיים עם הודעה של 7 ימים.</li><li>סעיפי הסודיות וקניין רוחני <strong>ממשיכים לחול לאחר סיום.</strong></li></ul> },
          { t: '8. הגבלת אחריות', c: <p>המערכת ניתנת &quot;כמות שהיא&quot; (AS IS). החברה לא תישא באחריות לנזקים עקיפים.</p> },
          { t: '9. הפרה ופיצויים', c: <p>הפרת סעיפי הסודיות תזכה את החברה בפיצוי מוסכם של <strong>₪50,000</strong> מבלי לגרוע מסעד אחר על פי דין.</p> },
          { t: '10. דין חל', c: <p>הסכם זה כפוף לדיני מדינת ישראל. סמכות שיפוט: בתי המשפט במחוז תל אביב.</p> },
        ].map((s) => (
          <div key={s.t} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#00e5b0', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{s.t}</h2>
            <div style={{ fontSize: 13, color: '#a8bcc8', lineHeight: '1.9' }}>{s.c}</div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40, paddingTop: 30, borderTop: '2px solid rgba(255,255,255,0.06)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#5a7080', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 50 }}>החברה — Zikkit</div>
            <div style={{ borderBottom: '1px solid #5a7080', marginBottom: 8, height: 40 }}></div>
            <div style={{ fontSize: 12, color: '#a8bcc8' }}>ליאל אוחנה — מייסד</div>
            <div style={{ fontSize: 11, color: '#5a7080', marginTop: 12 }}>תאריך: _______________</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#5a7080', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 50 }}>הלקוח</div>
            <div style={{ borderBottom: '1px solid #5a7080', marginBottom: 8, height: 40 }}></div>
            <div style={{ fontSize: 12, color: '#a8bcc8' }}>שם: _________________________</div>
            <div style={{ fontSize: 11, color: '#5a7080', marginTop: 12 }}>תאריך: _______________</div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 30, fontSize: 10, color: '#5a7080' }}>Zikkit © 2026 — הסכם פיילוט חינם — גרסה 1.0</p>
      </div>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } div { color: #222 !important; } }`}</style>
    </div>
  );
}
