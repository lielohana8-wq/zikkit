'use client';
export default function InvestorAgreementPage() {
  return (
    <div style={{ background: '#07090b', minHeight: '100vh', padding: 20, direction: 'rtl', fontFamily: 'Inter, sans-serif', color: '#e8f0f4' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }} className="no-print">
        <button onClick={() => window.print()} style={{ padding: '10px 30px', background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>🖨️ הדפס / שמור כ-PDF</button>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#0f1318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 50 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'inline-flex', width: 60, height: 60, background: '#00e5b0', borderRadius: 14, alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#000' }}>Zk</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', color: '#4f8fff', marginBottom: 6 }}>הסכם סודיות וגישה למשקיעים</h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#5a7080', marginBottom: 10 }}>Non-Disclosure Agreement — Investor Access</p>
        <p style={{ textAlign: 'center', marginBottom: 40 }}><span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(255,77,109,0.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.2)' }}>סודי ביותר — CONFIDENTIAL</span></p>

        {[
          { t: '1. הצדדים', c: <><p><strong>&quot;החברה&quot;</strong> — Zikkit (ליאל אוחנה), מפתח ומפעיל מערכת Zikkit.</p><p><strong>&quot;המשקיע&quot;</strong> — _____________________________ (שם מלא),</p><p>חברה/קרן: _____________________________ טלפון: _________________ מייל: _________________________________</p></> },
          { t: '2. מטרת ההסכם', c: <p>החברה מעניקה למשקיע גישה למערכת Zikkit, למצגות, לנתונים עסקיים ולמידע טכני — <strong>אך ורק לצורך הערכת השקעה פוטנציאלית</strong>. כל מידע שנחשף כפוף לתנאי סודיות מחמירים.</p> },
          { t: '3. גישה למשקיע', c: <ul><li>דמו חי של מערכת Zikkit (ממשק, פיצ&apos;רים, בוט AI)</li><li>מצגת משקיעים: מודל עסקי, TAM/SAM/SOM, unit economics, roadmap</li><li>מידע טכני: ארכיטקטורה, טכנולוגיות</li><li>נתוני ביצועים ועלויות תפעול (אם ישותפו)</li><li>תוכניות עתידיות ואסטרטגיית צמיחה</li></ul> },
          { t: '4. הגדרת "מידע סודי"', c: <><p>כל מידע שנמסר למשקיע ייחשב <strong>&quot;מידע סודי&quot;</strong>, כולל:</p><ul><li>קוד מקור, ארכיטקטורת מערכת, אלגוריתמים, prompts של AI</li><li>עיצוב ממשק, חוויית משתמש, מבנה דפים</li><li>מודל עסקי, תמחור, עלויות, הכנסות, נתוני לקוחות</li><li>תוכניות עתידיות, roadmap, שותפויות אפשריות</li></ul></> },
          { t: '5. התחייבויות המשקיע', c: <><div style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.15)', borderRadius: 10, padding: '12px 16px', margin: '12px 0' }}><p style={{ color: '#ff4d6d', fontWeight: 600 }}>⚠️ התחייבויות אלו חלות ללא הגבלת זמן — גם אם ההשקעה לא תתבצע.</p></div><ol><li><strong>לא לגלות</strong> כל מידע סודי לצד שלישי ללא אישור בכתב.</li><li><strong>לא להעתיק</strong> קוד, עיצוב, ממשק, או כל רכיב — ישירות או בעקיפין.</li><li><strong>לא להשתמש</strong> במידע הסודי מלבד הערכת ההשקעה.</li><li><strong>לא לפתח, לממן, או לייעץ</strong> למוצר מתחרה.</li><li><strong>לא לצלם מסכים</strong> או לתעד ללא אישור.</li><li><strong>לא לשתף גישה</strong> עם גורמים לא מורשים.</li><li><strong>להשמיד או להחזיר</strong> כל חומר סודי תוך 14 יום מבקשה.</li></ol></> },
          { t: '6. חריגים', c: <><p>הסודיות אינה חלה על מידע ש:</p><ul><li>היה ידוע למשקיע לפני החשיפה (עם הוכחה)</li><li>הפך ציבורי שלא באשמת המשקיע</li><li>נדרש לגילוי על פי צו בית משפט (עם הודעה מוקדמת)</li></ul></> },
          { t: '7. קניין רוחני', c: <><p>כל הזכויות ב-Zikkit שייכים באופן בלעדי לחברה. הסכם זה <strong>אינו מעניק</strong> למשקיע כל זכות קניין רוחני.</p><div style={{ background: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.15)', borderRadius: 10, padding: '12px 16px', margin: '12px 0' }}><p style={{ color: '#4f8fff', fontWeight: 600 }}>💡 גישה למערכת ≠ בעלות. עד לחתימת הסכם השקעה נפרד, למשקיע אין אחזקה בחברה.</p></div></> },
          { t: '8. תקופת הגישה', c: <ul><li>גישה ל-<strong>30 יום</strong> מיום החתימה.</li><li>החברה רשאית להאריך או לבטל בכל עת.</li><li><strong>סעיפי הסודיות חלים ללא הגבלת זמן.</strong></li></ul> },
          { t: '9. הפרה ופיצויים', c: <p>הפרה תזכה את החברה בפיצוי מוסכם של <strong>₪100,000</strong> (מאה אלף שקלים חדשים) מבלי לגרוע מסעדים אחרים, כולל צו מניעה זמני.</p> },
          { t: '10. אי-תחרות', c: <p>למשך <strong>24 חודשים</strong> מיום החתימה, המשקיע מתחייב שלא להשקיע, לפתח, לייעץ, או לסייע למוצר מתחרה ישיר ל-Zikkit בתחום ניהול עסקי שדה עם AI.</p> },
          { t: '11. דין חל', c: <p>הסכם זה כפוף לדיני מדינת ישראל. סמכות שיפוט: בתי המשפט במחוז תל אביב.</p> },
        ].map((s) => (
          <div key={s.t} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#4f8fff', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{s.t}</h2>
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
            <div style={{ fontSize: 11, color: '#5a7080', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 50 }}>המשקיע</div>
            <div style={{ borderBottom: '1px solid #5a7080', marginBottom: 8, height: 40 }}></div>
            <div style={{ fontSize: 12, color: '#a8bcc8' }}>שם: _________________________</div>
            <div style={{ fontSize: 11, color: '#5a7080', marginTop: 12 }}>תאריך: _______________</div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 30, fontSize: 10, color: '#5a7080' }}>Zikkit © 2026 — הסכם סודיות למשקיעים — גרסה 1.0 — סודי</p>
      </div>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } div { color: #222 !important; } }`}</style>
    </div>
  );
}
