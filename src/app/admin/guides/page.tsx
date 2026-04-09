'use client';
import { useState } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
const C = { sf: '#0f1318', ac: '#00e5b0', bl: '#4f8fff', tx: '#e8f0f4', t2: '#a8bcc8', t3: '#5a7080', border: 'rgba(255,255,255,0.055)' };

interface Guide {
  title: string;
  desc: string;
  color: string;
  icon: string;
  steps: { title: string; content: string }[];
}

const guides: Guide[] = [
  {
    title: 'מדריך הקמה מלא', desc: 'כל השלבים מ-0 עד עלייה לאוויר', color: C.ac, icon: '🚀',
    steps: [
      { title: '1. צור חשבון Firebase', content: 'לך ל-console.firebase.google.com, צור פרויקט חדש. הפעל Authentication (Email/Password) ו-Firestore Database.' },
      { title: '2. הגדר Firestore Rules', content: 'העתק את ה-Rules מהקובץ firestore.rules ופרסם ב-Firestore → Rules → Publish.' },
      { title: '3. הגדר .env.local', content: 'העתק את מפתחות Firebase מ-Project Settings → General → Your apps → Config לתוך קובץ .env.local.' },
      { title: '4. הוסף לקוח ראשון', content: 'לך לדף "הוסף לקוח" באדמין, מלא פרטים, בחר תוכנית, ולחץ צור.' },
      { title: '5. הגדר Twilio (אופציונלי)', content: 'צור חשבון ב-twilio.com, קבל Account SID + Auth Token, הכנס בדף הגדרות מערכת.' },
      { title: '6. הגדר Anthropic (אופציונלי)', content: 'צור מפתח ב-console.anthropic.com → API Keys → Create Key. נדרש ל-AI Voice Bot ו-Chat.' },
      { title: '7. עלייה לאוויר', content: 'פרוס ב-Vercel: חבר GitHub repo, הוסף Environment Variables, ולחץ Deploy.' },
    ],
  },
  {
    title: 'מדריך Twilio', desc: 'הגדרת חשבון Twilio לשיחות ו-SMS', color: C.bl, icon: '📞',
    steps: [
      { title: '1. צור חשבון', content: 'לך ל-twilio.com/try-twilio ותירשם. תקבל $15 קרדיט לנסיון.' },
      { title: '2. קבל Account SID + Auth Token', content: 'בדשבורד של Twilio (twilio.com/console) — תראה את Account SID ו-Auth Token בעמוד הראשי.' },
      { title: '3. קנה מספר טלפון', content: 'Phone Numbers → Buy a Number. לישראל צריך אישור רגולטורי (1-3 ימי עסקים). לארה"ב — מיידי.' },
      { title: '4. הגדר Webhooks', content: 'Phone Numbers → Manage → Active Numbers → לחץ על המספר → Voice: HTTP POST → https://your-domain.com/api/voice/incoming' },
      { title: '5. הכנס ב-Zikkit', content: 'לך להגדרות מערכת (Admin → מפתחות API) והכנס את ה-SID וה-Token.' },
    ],
  },
  {
    title: 'צ\'קליסט QA', desc: 'בדיקות לפני עלייה לאוויר', color: '#a78bfa', icon: '✅',
    steps: [
      { title: 'רישום + התחברות', content: '☐ רישום עובד\n☐ אימות מייל עובד\n☐ התחברות עובדת\n☐ שחזור סיסמה עובד\n☐ Setup Wizard מופיע' },
      { title: 'עבודות', content: '☐ יצירת עבודה\n☐ עריכת עבודה\n☐ סגירת עבודה עם תשלום\n☐ שינוי סטטוס\n☐ שיתוף WhatsApp\n☐ מחיקה' },
      { title: 'לידים', content: '☐ יצירת ליד\n☐ המרה לעבודה\n☐ פילטרים\n☐ מעקב' },
      { title: 'הצעות מחיר', content: '☐ יצירת הצעה\n☐ הוספת מוצרים\n☐ שליחה בWhatsApp\n☐ שינוי סטטוס' },
      { title: 'דוחות', content: '☐ גרף הכנסות\n☐ דוח לפי טכנאי\n☐ דוח לפי מקור\n☐ הוצאות\n☐ סינון תקופה' },
      { title: 'טכנאים + משתמשים', content: '☐ הוספת טכנאי\n☐ הרשאות מותאמות\n☐ איפוס סיסמה\n☐ תפקיד Custom' },
      { title: 'מובייל', content: '☐ כל הדפים רספונסיביים\n☐ ניווט תחתון עובד\n☐ טפסים נגישים במובייל' },
    ],
  },
  {
    title: 'צ\'קליסט בוקר', desc: 'בדיקות יומיות', color: '#f59e0b', icon: '☀️',
    steps: [
      { title: '1. בדוק שרת', content: 'פתח את האתר ווודא שהוא נטען. בדוק Console ב-F12 לשגיאות.' },
      { title: '2. בדוק Firebase', content: 'console.firebase.google.com → Authentication: כמה משתמשים חדשים? Firestore: גודל DB?' },
      { title: '3. בדוק Twilio', content: 'twilio.com/console → שיחות נכשלות? SMS שלא נשלחו? קרדיט נמוך?' },
      { title: '4. בדוק תמיכה', content: 'מיילים מלקוחות? הודעות WhatsApp? פידבק?' },
      { title: '5. MRR + לקוחות', content: 'כמה לקוחות פעילים? כמה ב-Trial? כמה עומדים לפוג?' },
    ],
  },
];

export default function GuidesPage() {
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx, mb: 0.5 }}>מדריכים</Typography>
      <Typography sx={{ fontSize: 12, color: C.t3, mb: 3 }}>כל המדריכים והצ'קליסטים</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, '@media(max-width:768px)': { gridTemplateColumns: '1fr' } }}>
        {guides.map((g, gi) => (
          <Card key={g.title} sx={{
            cursor: 'pointer', transition: 'all 0.2s',
            border: openGuide === gi ? '1px solid ' + g.color : '1px solid ' + C.border,
            '&:hover': { borderColor: g.color },
          }} onClick={() => setOpenGuide(openGuide === gi ? null : gi)}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ fontSize: 24 }}>{g.icon}</Typography>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: g.color }}>{g.title}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.t3 }}>{g.desc}</Typography>
                </Box>
              </Box>

              {openGuide === gi && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }} onClick={(e) => e.stopPropagation()}>
                  {g.steps.map((step, si) => (
                    <Box key={si} sx={{
                      bgcolor: 'rgba(255,255,255,0.025)', borderRadius: '10px', p: '12px 14px',
                      borderRight: '3px solid ' + g.color,
                    }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.tx, mb: 0.5 }}>{step.title}</Typography>
                      <Typography sx={{ fontSize: 11, color: C.t2, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{step.content}</Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {openGuide !== gi && (
                <Typography sx={{ fontSize: 10, color: C.t3, mt: 1, fontStyle: 'italic' }}>
                  {g.steps.length} שלבים — לחץ לפתיחה
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
