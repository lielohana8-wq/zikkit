'use client';
import { Box, Typography } from '@mui/material';
const C = { sf: '#0f1318', ac: '#00e5b0', bl: '#4f8fff', tx: '#e8f0f4', t3: '#5a7080', border: 'rgba(255,255,255,0.055)' };
const steps = [
  { n: '1', t: 'GitHub Private Repo', d: 'העלה קוד', c: C.bl },
  { n: '2', t: 'Vercel Deploy', d: 'חבר Repo + הגדר ENV', c: C.ac },
  { n: '3', t: 'דומיין', d: 'קנה + חבר ב-Vercel', c: '#a78bfa' },
  { n: '4', t: 'Firestore Rules', d: 'הדבק Rules עדכניים', c: '#22c55e' },
  { n: '5', t: 'API Keys', d: 'Twilio + Resend + Anthropic', c: '#f59e0b' },
  { n: '6', t: 'QA סופי', d: 'הרץ צ\'קליסט על הדומיין', c: '#ff4d6d' },
];
export default function LaunchPage() {
  return (
    <Box dir="rtl">
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx, mb: 3 }}>עלייה לאוויר</Typography>
      {steps.map((st) => (
        <Box key={st.n} sx={{ display: 'flex', gap: 2, alignItems: 'center', bgcolor: C.sf, border: '1px solid ' + C.border, borderRadius: '12px', p: 2, mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: st.c + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: st.c, flexShrink: 0 }}>{st.n}</Box>
          <Box><Typography sx={{ fontSize: 14, fontWeight: 800, color: C.tx }}>{st.t}</Typography><Typography sx={{ fontSize: 10, color: C.t3 }}>{st.d}</Typography></Box>
        </Box>
      ))}
    </Box>
  );
}
