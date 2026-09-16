'use client';
import { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent } from '@mui/material';
const C = { sf: '#FAF7F4', ac: '#4F46E5', bl: '#4f8fff', tx: '#e8f0f4', t2: '#a8bcc8', t3: '#5a7080', border: 'rgba(255,255,255,0.055)' };

interface Plan { name: string; pIL: string; pUS: string; techs: string; calls: string; c: string; }

const defaultPlans: Plan[] = [
  { name: 'Starter', pIL: '499', pUS: '699', techs: '3', calls: '500', c: C.bl },
  { name: 'Business', pIL: '4490', pUS: '6290', techs: '3', calls: '500', c: C.ac },
  { name: 'Unlimited', pIL: '749', pUS: '1099', techs: 'unlimited', calls: 'unlimited', c: '#a78bfa' },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (idx: number, key: keyof Plan, val: string) => {
    const copy = [...plans];
    copy[idx] = { ...copy[idx], [key]: val };
    setPlans(copy);
  };

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Box dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.tx, mb: 0.5 }}>תמחור</Typography>
          <Typography sx={{ fontSize: 12, color: C.t3 }}>ניהול חבילות ומחירים — לחץ על חבילה לעריכה</Typography>
        </Box>
        <Button onClick={save} sx={{ bgcolor: 'rgba(0,229,176,0.1)', color: C.ac, border: '1px solid rgba(0,229,176,0.2)', borderRadius: '10px', px: 3, fontWeight: 700 }}>
          {saved ? '✅ נשמר!' : '💾 שמור מחירים'}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3, '@media(max-width:768px)': { gridTemplateColumns: '1fr' } }}>
        {plans.map((pl, i) => (
          <Card key={pl.name} onClick={() => setEditing(editing === i ? null : i)} sx={{
            cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
            border: editing === i ? '1px solid ' + pl.c : '1px solid ' + C.border,
            '&:hover': { borderColor: pl.c },
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: pl.c }} />
            <CardContent sx={{ p: 3 }}>
              {editing === i ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} onClick={(e) => e.stopPropagation()}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: pl.c, mb: 1 }}>✏️ עריכת {pl.name}</Typography>
                  <Box>
                    <Typography sx={{ fontSize: 9, color: C.t3, fontWeight: 700, textTransform: 'uppercase' }}>מחיר ₪/חודש</Typography>
                    <TextField fullWidth size="small" value={pl.pIL} onChange={(e) => update(i, 'pIL', e.target.value)} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 9, color: C.t3, fontWeight: 700, textTransform: 'uppercase' }}>מחיר $/חודש</Typography>
                    <TextField fullWidth size="small" value={pl.pUS} onChange={(e) => update(i, 'pUS', e.target.value)} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 9, color: C.t3, fontWeight: 700, textTransform: 'uppercase' }}>טכנאים</Typography>
                    <TextField fullWidth size="small" value={pl.techs} onChange={(e) => update(i, 'techs', e.target.value)} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 9, color: C.t3, fontWeight: 700, textTransform: 'uppercase' }}>שיחות בוט</Typography>
                    <TextField fullWidth size="small" value={pl.calls} onChange={(e) => update(i, 'calls', e.target.value)} />
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: pl.c, mb: 1 }}>{pl.name}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: C.tx }}>₪{pl.pIL} /חודש</Typography>
                  <Typography sx={{ fontSize: 13, color: C.t3, mb: 2 }}>${pl.pUS}/mo</Typography>
                  <Typography sx={{ fontSize: 11, color: C.t2 }}>טכנאים: {pl.techs === 'unlimited' ? 'ללא הגבלה' : 'עד ' + pl.techs}</Typography>
                  <Typography sx={{ fontSize: 11, color: C.t2 }}>שיחות בוט: {pl.calls === 'unlimited' ? 'ללא הגבלה' : pl.calls}</Typography>
                  <Typography sx={{ fontSize: 9, color: C.t3, mt: 1, fontStyle: 'italic' }}>לחץ לעריכה</Typography>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.ac, mb: 1 }}>הכנסות לפי שימוש</Typography>
          <Typography sx={{ fontSize: 11, color: C.t2 }}>שיחות בוט: $0.05/דקה (מרווח 60%)</Typography>
          <Typography sx={{ fontSize: 11, color: C.t2 }}>הודעות SMS: $0.02/הודעה (מרווח 60%)</Typography>
          <Typography sx={{ fontSize: 11, color: C.t2 }}>מספר טלפון: $3/חודש (מרווח 67%)</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
