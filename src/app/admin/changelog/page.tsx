'use client';
import { Box, Typography, Card, CardContent } from '@mui/material';
const C = { sf: '#0f1318', ac: '#00e5b0', bl: '#4f8fff', tx: '#e8f0f4', t2: '#a8bcc8', t3: '#5a7080', border: 'rgba(255,255,255,0.055)' };

const logs = [
  {
    ver: 'v8.0', date: '10/03/2026', tag: 'CURRENT', tagColor: '#00e5b0',
    items: [
      '🔐 מערכת הרשאות מלאה — 10 הרשאות, תפקיד Custom, שם תפקיד מותאם',
      '📧 חסימה עד אימות מייל — מסך ייעודי, בדיקה אוטומטית כל 5 שניות',
      '💳 שיטת תשלום בסגירת עבודה — מזומן, אשראי, צ\'ק, העברה, Bit',
      '💸 ניהול הוצאות בדוחות — הוספה/עריכה/מחיקה, 11 קטגוריות',
      '📅 דף לוח זמנים טכנאי — תצוגת יום/שבוע, ניווט, KPIs',
      '📄 דף הצעות מחיר טכנאי — יצירה בשטח, WhatsApp, KPIs',
      '📍 דף GPS טכנאי — Check-in/Out עם geolocation אמיתי',
      '🤖 סימולטור בוט חכם — תשובות לפי הקשר, לא רק greeting',
      '🔧 תיקון Sidebar — /technicians לא מציג ממשק טכנאי',
      '🔧 תיקון Register — selectedPlan, error recovery, sign out on back',
      '🔧 תיקון Firestore Rules — הרשאות כתיבה לרישום',
      '🔧 תיקון Setup Wizard — הפעלה אוטומטית אחרי רישום',
      '📊 Admin Dashboard — KPIs מלאים, MRR, התראות תוקף',
      '🏪 Admin Clients — תוקף, תוכנית, הארכה, שינוי סטטוס',
      '📖 Admin Guides — 4 מדריכים מלאים עם תוכן אמיתי',
      '💰 Admin Pricing — עריכה ישירה של מחירים',
      '➕ Admin Add Client — בחירת תוכנית + חישוב תוקף אוטומטי',
      '⌨️ Enter שולח טופס רישום',
    ],
  },
  {
    ver: 'v7.2', date: '07/03/2026', tag: null, tagColor: '',
    items: [
      '📝 הסכמים עם חתימה דיגיטלית ושליחה במייל',
      '💬 SMS + WhatsApp בהצעות מחיר ועבודות',
      '🧙 אשף הקמה (Setup Wizard)',
      '🏢 Multi-location / ריבוי סניפים',
      '🔄 מעבר בין ממשק בעלים וטכנאי',
      '🔔 מערכת התראות',
      '⏱️ Idle Timeout',
    ],
  },
  {
    ver: 'v7.0', date: '06/03/2026', tag: null, tagColor: '',
    items: [
      '📞 Twilio Master Account — ניהול טלפונים',
      '🤖 בוט קולי Claude AI — מענה 24/7',
      '💬 SMS Bot — הודעות אוטומטיות',
      '📱 הקצאת מספר טלפון אוטומטית',
      '📧 מערכת אימיילים אוטומטית',
      '🔗 פורטל לקוח עם לינק ייחודי',
    ],
  },
  {
    ver: 'v6.0', date: '06/03/2026', tag: null, tagColor: '',
    items: [
      '📄 פורטל לקוח PDF',
      '📧 מייל הצעות מחיר וקבלות',
      '💬 צ\'אט AI מובנה',
      '🎨 עיצוב Obsidian Premium',
      '🌐 3 שפות — EN/ES/HE + RTL',
      '💳 Paddle Billing Integration',
    ],
  },
  {
    ver: 'v5.0', date: '05/03/2026', tag: null, tagColor: '',
    items: [
      '📊 Dashboard עם 8 ווידג\'טים',
      '🔧 ניהול עבודות מלא — 11 סטטוסים',
      '📞 CRM / ניהול לידים',
      '📄 הצעות מחיר',
      '👷 ניהול טכנאים',
      '📦 מחירון מוצרים',
      '📈 דוחות הכנסה ורווח',
      '💰 Payroll — שכר ועמלות',
      '🗺️ GPS Tracking',
      '👥 ניהול משתמשים',
      '⚙️ הגדרות',
      '🔐 Admin Console',
    ],
  },
  {
    ver: 'v1.0', date: '03/03/2026', tag: null, tagColor: '',
    items: [
      '🚀 מיגרציה מ-HTML למערכת Next.js 14',
      '🔐 Firebase Auth + Firestore',
      '📱 Login / Register',
      '🏗️ ארכיטקטורת DataBridge',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx, mb: 0.5 }}>📋 Changelog</Typography>
      <Typography sx={{ fontSize: 12, color: C.t3, mb: 3 }}>היסטוריית גרסאות ושינויים</Typography>
      {logs.map((l) => (
        <Card key={l.ver} sx={{ mb: 2, border: l.tag ? '1px solid rgba(0,229,176,0.2)' : undefined }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: l.tag ? C.ac : C.tx, fontFamily: "'Syne', sans-serif" }}>{l.ver}</Typography>
              <Typography sx={{ fontSize: 11, color: C.t3, fontFamily: 'monospace' }}>{l.date}</Typography>
              {l.tag && (
                <Box sx={{ px: '8px', py: '2px', borderRadius: '12px', fontSize: 9, fontWeight: 800, bgcolor: 'rgba(0,229,176,0.1)', color: C.ac, border: '1px solid rgba(0,229,176,0.25)' }}>
                  {l.tag}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {l.items.map((it, i) => (
                <Typography key={i} sx={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{it}</Typography>
              ))}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
