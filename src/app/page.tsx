'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { icon: '📞', title: 'בוט AI קולי', desc: 'עונה ללקוחות 24/7, לוקח פרטים, פותח עבודה אוטומטית. גם בשבת, גם ב-3 בלילה.', color: '#4F46E5' },
  { icon: '📋', title: 'ניהול עבודות', desc: 'מהפנייה ועד הסגירה. סטטוסים, תיאורים, תמונות, חתימה דיגיטלית — הכל במקום אחד.', color: '#059669' },
  { icon: '📅', title: 'לוח זמנים חכם', desc: 'רואים במבט מי עובד מתי ואיפה. גוררים עבודה לטכנאי ולשעה. שיבוץ אוטומטי בלחיצה.', color: '#D97706' },
  { icon: '💰', title: 'הצעות מחיר + חשבוניות', desc: 'יוצרים ושולחים ללקוח בדקה. חתימה דיגיטלית, תשלום אונליין, מעקב אוטומטי.', color: '#7C3AED' },
  { icon: '📍', title: 'GPS בזמן אמת', desc: 'רואים על מפה איפה כל טכנאי. יודעים מי זמין, מי בעבודה, מי הכי קרוב.', color: '#0D9488' },
  { icon: '📊', title: 'דוחות + שכר אוטומטי', desc: 'הכנסות, הוצאות, עמלות, רווחיות — הכל מחושב אוטומטית. סוף חודש בלי בלאגן.', color: '#E11D48' },
  { icon: '👥', title: 'CRM + ניהול לידים', desc: 'כל ליד נכנס למערכת אוטומטית. מעקב, תזכורות, המרה לעבודה בלחיצה.', color: '#2563EB' },
  { icon: '🤖', title: 'אוטומציה מלאה', desc: 'SMS לפני הגעה, תזכורת תשלום, סיכום עבודה — הכל קורה לבד. אתה רק עובד.', color: '#F59E0B' },
  { icon: '📱', title: 'אפליקציה לטלפון', desc: 'הטכנאים רואים עבודות, מעדכנים סטטוס, מצלמים, חותמים — מהטלפון שלהם.', color: '#8B5CF6' },
];

const PROBLEMS = [
  'לקוחות מתקשרים ואין מי שיענה',
  'עבודות נופלות בין הכיסאות',
  'לא יודעים איפה הטכנאים עכשיו',
  'הצעות מחיר על דף ביד, חשבוניות באקסל',
  'סוף חודש — בלאגן עם שכר ועמלות',
  '5 אפליקציות שלא מדברות אחת עם השנייה',
];

const INDUSTRIES = ['אינסטלציה', 'חשמל', 'מיזוג אוויר', 'מנעולנות', 'ניקיון', 'הדברה', 'דלתות מוסך', 'שיפוצים', 'מעליות', 'גינון', 'מוצרי חשמל', 'ועוד...'];

export default function LandingPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <div dir="rtl" style={{ fontFamily: "'Rubik', system-ui, sans-serif", background: '#FAFAF8', color: '#1C1917', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        .fade-up{opacity:0;transform:translateY(30px);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)}
        .fade-up.vis{opacity:1;transform:translateY(0)}
        .hero-glow{position:absolute;width:600px;height:600px;border-radius:50%;filter:blur(120px);opacity:0.15;pointer-events:none}
        .btn-primary{background:#4F46E5;color:#fff;border:none;padding:14px 36px;border-radius:28px;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px}
        .btn-primary:hover{background:#4338CA;transform:translateY(-2px);box-shadow:0 8px 30px rgba(79,70,229,0.3)}
        .btn-secondary{background:transparent;color:#4F46E5;border:2px solid #4F46E5;padding:12px 32px;border-radius:28px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.2s}
        .btn-secondary:hover{background:#4F46E5;color:#fff}
        .feat-card{background:#fff;border-radius:16px;padding:28px;border:1px solid rgba(0,0,0,0.05);transition:all 0.3s;position:relative;overflow:hidden}
        .feat-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,0.06)}
        .section{padding:80px 24px;max-width:1200px;margin:0 auto}
        @media(max-width:768px){.section{padding:50px 16px}.hero-title{font-size:32px!important}.hero-sub{font-size:16px!important}}
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(250,250,248,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>Z</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Zikkit</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => router.push('/login')} className="btn-secondary" style={{ padding: '8px 24px', fontSize: 13 }}>כניסה</button>
          <button onClick={() => router.push('/register')} className="btn-primary" style={{ padding: '8px 24px', fontSize: 13 }}>התחל בחינם</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', paddingTop: 80 }}>
        <div className="hero-glow" style={{ background: '#4F46E5', top: -100, right: -200 }} />
        <div className="hero-glow" style={{ background: '#059669', bottom: -100, left: -200 }} />
        <div className={`section fade-up ${visible ? 'vis' : ''}`} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 24, padding: '6px 20px', fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 24 }}>
            🚀 מערכת ניהול AI לעסקי שירות
          </div>
          <h1 className="hero-title" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
            העסק שלך<br /><span style={{ color: '#4F46E5' }}>על אוטומט.</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 20, color: '#78716C', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.7 }}>
            בוט AI עונה ללקוחות, מנהל עבודות, שולח הצעות מחיר, עוקב אחרי טכנאים — הכל ממקום אחד. בלי פקידה, בלי 5 אפליקציות.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <button onClick={() => router.push('/register')} className="btn-primary">התחל ניסיון חינם ←</button>
            <button onClick={() => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior: 'smooth' }); }} className="btn-secondary">מה בפנים? ↓</button>
          </div>
          <p style={{ fontSize: 12, color: '#A8A29E' }}>14 יום חינם · ללא כרטיס אשראי · ביטול בכל עת</p>

          {/* App mockup */}
          <div style={{ marginTop: 48, position: 'relative', maxWidth: 800, margin: '48px auto 0' }}>
            <div style={{ background: '#1C1917', borderRadius: 16, padding: '8px 8px 0', boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', gap: 6, padding: '4px 8px 8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E11D48' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D97706' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669' }} />
              </div>
              <div style={{ background: '#F5F0EB', borderRadius: '10px 10px 0 0', padding: 20, direction: 'rtl' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>Z</div>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>דשבורד</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                  {[['₪47,820','הכנסה חודשית','#4F46E5'],['23','עבודות פתוחות','#059669'],['14','לידים חדשים','#D97706'],['94%','אחוז השלמה','#7C3AED']].map(([v,l,clr]) => (
                    <div key={l} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', borderRight: `3px solid ${clr}` }}>
                      <div style={{ fontSize: 10, color: '#A8A29E' }}>{l}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1917' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📅 עבודות היום</div>
                    {[['08:00','דוד כהן — תיקון צנרת','בטיפול','#D97706'],['10:30','שרה לוי — התקנת דוד','מתוכנן','#4F46E5'],['14:00','אבי ישראלי — נזילה','חדש','#059669']].map(([t,n,s,clr]) => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: 11 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4F46E5', minWidth: 38 }}>{t}</span>
                        <span style={{ flex: 1, fontWeight: 500 }}>{n}</span>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: clr + '15', color: clr, fontWeight: 600 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📊 גרף הכנסות</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                      {[40,65,50,80,70,90,75].map((h,i) => (
                        <div key={i} style={{ flex: 1, height: h + '%', background: i === 5 ? '#4F46E5' : '#E8E5FF', borderRadius: 4, transition: 'all 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, color: '#A8A29E' }}>
                      {['א','ב','ג','ד','ה','ו','ש'].map(d => <span key={d}>{d}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section style={{ background: '#1C1917', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 }}>מכירים את זה?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>הבעיות שכל בעל עסק שירות מתמודד איתן</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {PROBLEMS.map((p, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                <span style={{ fontSize: 20, color: '#E11D48' }}>✗</span>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'inline-block', background: 'rgba(79,70,229,0.15)', borderRadius: 24, padding: '8px 24px', fontSize: 15, fontWeight: 700, color: '#818CF8' }}>
              Zikkit פותר את הכל ממקום אחד ↓
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>הכל בפנים.</h2>
          <p style={{ fontSize: 16, color: '#78716C', maxWidth: 500, margin: '0 auto' }}>מערכת אחת שמחליפה פקידה + 5 אפליקציות שונות</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: f.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#78716C', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section style={{ background: '#F5F0EB', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>מתאים לכל עסק שירות</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {INDUSTRIES.map((ind, i) => (
              <span key={i} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, padding: '8px 20px', fontSize: 14, fontWeight: 500, color: '#57534E' }}>{ind}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>מוכנים להריץ את העסק<br /><span style={{ color: '#4F46E5' }}>על אוטומט?</span></h2>
          <p style={{ fontSize: 16, color: '#78716C', marginBottom: 32, lineHeight: 1.7 }}>14 יום ניסיון חינם. ללא כרטיס אשראי. ללא התחייבות.</p>
          <button onClick={() => router.push('/register')} className="btn-primary" style={{ fontSize: 18, padding: '16px 48px' }}>
            התחל עכשיו בחינם ←
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1C1917', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>Z</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Zikkit</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 Zikkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
