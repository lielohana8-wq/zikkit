'use client';
import { useState } from 'react';
import { Box, Typography, Card, CardContent, Checkbox } from '@mui/material';

const C = { sf: '#FAF7F4', ac: '#4F46E5', bl: '#4f8fff', tx: '#e8f0f4', t2: '#a8bcc8', t3: '#5a7080', border: 'rgba(255,255,255,0.055)', ok: '#22c55e', rd: '#ef4444' };

interface CheckItem { id: string; label: string; }
interface CheckGroup { title: string; icon: string; color: string; items: CheckItem[]; }

const CHECKLIST: CheckGroup[] = [
  {
    title: 'רישום + התחברות', icon: '🔐', color: C.ac,
    items: [
      { id: 'reg1', label: 'רישום עם מייל חדש עובד' },
      { id: 'reg2', label: 'מסך אימות מייל מופיע אחרי רישום' },
      { id: 'reg3', label: 'מייל אימות מגיע (בדוק ספאם)' },
      { id: 'reg4', label: 'לחיצה על לינק אימות פותח את המערכת' },
      { id: 'reg5', label: 'רישום עם מייל קיים — שגיאה ברורה' },
      { id: 'reg6', label: 'התחברות עם פרטים נכונים עובדת' },
      { id: 'reg7', label: 'התחברות עם סיסמה שגויה — שגיאה ברורה' },
      { id: 'reg8', label: 'שחזור סיסמה — מייל מגיע' },
      { id: 'reg9', label: 'Setup Wizard מופיע אחרי רישום ראשון' },
      { id: 'reg10', label: 'Setup Wizard לא מופיע בכניסה חוזרת' },
      { id: 'reg11', label: 'לחיצת Enter שולחת טופס רישום' },
      { id: 'reg12', label: 'כפתור "חזרה" מתנתק ומחזיר ל-Login' },
    ],
  },
  {
    title: 'Dashboard', icon: '📊', color: C.bl,
    items: [
      { id: 'dash1', label: 'KPIs מציגים נתונים אמיתיים' },
      { id: 'dash2', label: 'גרף הכנסות שבועי עובד' },
      { id: 'dash3', label: 'לוח זמנים היום מציג עבודות' },
      { id: 'dash4', label: 'דורש טיפול — לידים + עבודות באיחור' },
      { id: 'dash5', label: 'טכנאים מובילים מציג דירוג' },
      { id: 'dash6', label: 'כפתורי פעולה מהירה (+ עבודה, + ליד, + הצעה)' },
      { id: 'dash7', label: 'ברכה בעברית (בוקר טוב/ערב טוב)' },
    ],
  },
  {
    title: 'עבודות (Jobs)', icon: '🔧', color: '#f59e0b',
    items: [
      { id: 'job1', label: 'יצירת עבודה חדשה' },
      { id: 'job2', label: 'עריכת עבודה' },
      { id: 'job3', label: 'סגירת עבודה — סכום + חומרים + אמצעי תשלום' },
      { id: 'job4', label: 'חישוב רווח נקי (מע"מ + עמלה)' },
      { id: 'job5', label: 'שינוי סטטוס (כל 11 הסטטוסים)' },
      { id: 'job6', label: 'שיוך טכנאי לעבודה' },
      { id: 'job7', label: 'שליחת WhatsApp ללקוח' },
      { id: 'job8', label: 'שכפול עבודה' },
      { id: 'job9', label: 'מחיקת עבודה' },
      { id: 'job10', label: 'פילטר לפי סטטוס' },
      { id: 'job11', label: 'חיפוש עבודות' },
      { id: 'job12', label: 'Bulk actions (סימון מרובה)' },
      { id: 'job13', label: 'סטטוסים בעברית (פתוח, בטיפול, הושלם...)' },
    ],
  },
  {
    title: 'לידים (CRM)', icon: '📞', color: '#a78bfa',
    items: [
      { id: 'lead1', label: 'יצירת ליד חדש' },
      { id: 'lead2', label: 'עריכת ליד' },
      { id: 'lead3', label: 'המרת ליד לעבודה (Convert to Job)' },
      { id: 'lead4', label: 'פילטר לפי סטטוס (חדש, חם, קר...)' },
      { id: 'lead5', label: 'חיפוש לידים' },
      { id: 'lead6', label: 'תאריך מעקב — התראה על איחור' },
    ],
  },
  {
    title: 'הצעות מחיר', icon: '📄', color: '#06b6d4',
    items: [
      { id: 'q1', label: 'יצירת הצעת מחיר חדשה' },
      { id: 'q2', label: 'הוספת מוצרים מהמחירון' },
      { id: 'q3', label: 'חישוב סכום + מע"מ' },
      { id: 'q4', label: 'שליחה בוואטסאפ' },
      { id: 'q5', label: 'שינוי סטטוס (טיוטה, נשלח, אושר, נדחה)' },
      { id: 'q6', label: 'פורטל לקוח — לינק ייחודי' },
    ],
  },
  {
    title: 'דוחות', icon: '📈', color: C.ac,
    items: [
      { id: 'rep1', label: 'גרף הכנסות לפי תקופה' },
      { id: 'rep2', label: 'דוח לפי טכנאי' },
      { id: 'rep3', label: 'דוח לפי מקור ליד' },
      { id: 'rep4', label: 'סינון תקופה (7 ימים / חודש / שנה)' },
      { id: 'rep5', label: 'הוספת הוצאה' },
      { id: 'rep6', label: 'עריכת הוצאה' },
      { id: 'rep7', label: 'מחיקת הוצאה' },
      { id: 'rep8', label: 'חישוב רווח נקי (הכנסות - חומרים - הוצאות)' },
    ],
  },
  {
    title: 'טכנאים + משתמשים', icon: '👷', color: '#f59e0b',
    items: [
      { id: 'tech1', label: 'הוספת טכנאי חדש' },
      { id: 'tech2', label: 'עריכת טכנאי' },
      { id: 'tech3', label: 'מחיקת טכנאי' },
      { id: 'tech4', label: 'איפוס סיסמה' },
      { id: 'tech5', label: 'הרשאות מותאמות (10 toggles)' },
      { id: 'tech6', label: 'תפקיד Custom עם שם מותאם' },
      { id: 'tech7', label: 'כפתורי All On / All Off' },
    ],
  },
  {
    title: 'בוט AI', icon: '🤖', color: '#a78bfa',
    items: [
      { id: 'bot1', label: 'הגדרת ברכה' },
      { id: 'bot2', label: 'סימולטור — עונה בעברית לעסק ישראלי' },
      { id: 'bot3', label: 'סימולטור — עונה באנגלית לעסק אמריקאי' },
      { id: 'bot4', label: 'שאלה על מחיר — תשובה רלוונטית' },
      { id: 'bot5', label: 'שאלה על תור — תשובה רלוונטית' },
      { id: 'bot6', label: 'שאלה על חירום — תשובה רלוונטית' },
      { id: 'bot7', label: 'Flows מותאמים — trigger + response' },
      { id: 'bot8', label: 'Call Log מציג שיחות' },
    ],
  },
  {
    title: 'שפה + RTL', icon: '🌐', color: C.bl,
    items: [
      { id: 'lang1', label: 'שינוי שפה בהגדרות → נשמר ועובד' },
      { id: 'lang2', label: 'Sidebar בעברית' },
      { id: 'lang3', label: 'ניווט מובייל בעברית' },
      { id: 'lang4', label: 'כותרות דפים בעברית' },
      { id: 'lang5', label: 'סטטוסים בעברית (פתוח, בטיפול, הושלם...)' },
      { id: 'lang6', label: 'RTL — טקסט מימין לשמאל' },
      { id: 'lang7', label: 'מטבע ₪ לעסק ישראלי' },
      { id: 'lang8', label: 'שפה נשמרת בין כניסות' },
    ],
  },
  {
    title: 'מובייל', icon: '📱', color: '#f59e0b',
    items: [
      { id: 'mob1', label: 'Dashboard רספונסיבי' },
      { id: 'mob2', label: 'טבלאות גוללות אופקית' },
      { id: 'mob3', label: 'ניווט תחתון מופיע' },
      { id: 'mob4', label: 'Sidebar מתחבא במובייל' },
      { id: 'mob5', label: 'מודלים/פופאפים לא חורגים מהמסך' },
      { id: 'mob6', label: 'טפסים נגישים ולא חתוכים' },
    ],
  },
  {
    title: 'Admin', icon: '⚙️', color: C.rd,
    items: [
      { id: 'adm1', label: 'דשבורד — KPIs אמיתיים מ-Firestore' },
      { id: 'adm2', label: 'לקוחות — תוקף, תוכנית, סטטוס' },
      { id: 'adm3', label: 'לקוחות — הארכת תוקף עובדת' },
      { id: 'adm4', label: 'הוסף לקוח — בחירת תוכנית + תוקף אוטומטי' },
      { id: 'adm5', label: 'מפתחות API — שמירה ותצוגה' },
      { id: 'adm6', label: 'מדריכים — 4 מדריכים נפתחים' },
      { id: 'adm7', label: 'Changelog — v8.0 מעודכן' },
      { id: 'adm8', label: 'תמחור — עריכה עובדת' },
      { id: 'adm9', label: 'טסט שיחה קולית — כפתור עובד (עם ngrok)' },
    ],
  },
];

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('zk_qa_checklist') || '{}'); } catch { return {}; }
  });

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem('zk_qa_checklist', JSON.stringify(next));
  };

  const totalItems = CHECKLIST.reduce((s, g) => s + g.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <Box dir="rtl">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx }}>✅ צ'קליסט QA</Typography>
          <Typography sx={{ fontSize: 12, color: C.t3 }}>בדיקות לפני עלייה לאוויר — {totalChecked}/{totalItems}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 36, fontWeight: 900, color: pct === 100 ? C.ok : pct > 70 ? '#f59e0b' : C.rd, fontFamily: "'Syne', sans-serif" }}>
            {pct}%
          </Typography>
          <Box sx={{ width: 120, height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Box sx={{ width: pct + '%', height: '100%', borderRadius: 3, bgcolor: pct === 100 ? C.ok : pct > 70 ? '#f59e0b' : C.rd, transition: 'width 0.3s' }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, '@media(max-width:768px)': { gridTemplateColumns: '1fr' } }}>
        {CHECKLIST.map((group) => {
          const groupChecked = group.items.filter((i) => checked[i.id]).length;
          const groupDone = groupChecked === group.items.length;
          return (
            <Card key={group.title} sx={{ border: groupDone ? '1px solid rgba(34,197,94,0.3)' : undefined }}>
              <Box sx={{ p: '12px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: group.color }}>
                  {group.icon} {group.title}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: groupDone ? C.ok : C.t3 }}>
                  {groupChecked}/{group.items.length}
                </Typography>
              </Box>
              <CardContent sx={{ p: '4px 8px !important' }}>
                {group.items.map((item) => (
                  <Box key={item.id} onClick={() => toggle(item.id)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, p: '4px 8px', borderRadius: '6px',
                    cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                  }}>
                    <Checkbox checked={!!checked[item.id]} size="small"
                      sx={{ p: '2px', color: C.t3, '&.Mui-checked': { color: C.ok } }} />
                    <Typography sx={{
                      fontSize: 11, color: checked[item.id] ? C.ok : C.t2,
                      textDecoration: checked[item.id] ? 'line-through' : 'none',
                      opacity: checked[item.id] ? 0.7 : 1,
                    }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
