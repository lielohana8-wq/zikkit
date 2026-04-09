'use client';
import { Box, Typography, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { zikkitColors as c } from '@/styles/theme';

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

  const plans = [
    { id:'starter', name:'Starter', mo:'$699', yr:'$524', yrTotal:'$6,290/yr', desc:'Up to 3 technicians', features:['AI Voice Bot 24/7','500 AI calls/month','Job management','CRM + leads','Quotes + invoices','SMS automation','GPS tracking','Client portal','Reports'], pop:false },
    { id:'unlimited', name:'Unlimited', mo:'$1,099', yr:'$824', yrTotal:'$9,890/yr', desc:'Unlimited everything', features:['Everything in Starter','Unlimited technicians','Unlimited AI calls','Payroll + commissions','Advanced reports','Priority support','Multi-location','Custom branding','Export to Excel'], pop:true },
  ];

  return (
    <Box sx={{ bgcolor:c.bg,minHeight:'100vh',color:c.text,py:8,px:{xs:2,md:4} }}>
      <Box sx={{ maxWidth:900,mx:'auto',textAlign:'center' }}>
        <Typography sx={{ fontSize:{xs:28,md:40},fontWeight:900,fontFamily:'Syne, sans-serif',mb:1 }}>Simple Pricing. Massive Savings.</Typography>
        <Typography sx={{ fontSize:15,color:c.text2,mb:4 }}>ZIKKIT replaces your receptionist AND your management software. One price for everything.</Typography>
        <Box sx={{ display:'inline-flex',bgcolor:c.surface2,borderRadius:'10px',p:0.5,mb:5 }}>
          <Box onClick={() => setAnnual(false)} sx={{ px:3,py:1,borderRadius:'8px',cursor:'pointer',fontSize:13,fontWeight:!annual?700:500,color:!annual?'#000':c.text3,bgcolor:!annual?c.accent:'transparent' }}>Monthly</Box>
          <Box onClick={() => setAnnual(true)} sx={{ px:3,py:1,borderRadius:'8px',cursor:'pointer',fontSize:13,fontWeight:annual?700:500,color:annual?'#000':c.text3,bgcolor:annual?c.accent:'transparent' }}>Annual <span style={{fontSize:10,marginRight:4}}>save 25%</span></Box>
        </Box>
        <Box sx={{ display:'grid',gridTemplateColumns:{xs:'1fr',md:'1fr 1fr'},gap:3 }}>
          {plans.map(p => (
            <Box key={p.id} sx={{ p:4,borderRadius:'16px',bgcolor:p.pop?c.accentDim:c.surface2,border:p.pop?`2px solid ${c.accentMid}`:`1px solid ${c.border}`,position:'relative',textAlign:'left' }}>
              {p.pop && <Box sx={{ position:'absolute',top:-12,right:20,px:2,py:0.4,borderRadius:'8px',bgcolor:c.accent,color:'#000',fontSize:11,fontWeight:700 }}>Most Popular</Box>}
              <Typography sx={{ fontSize:14,fontWeight:600,color:c.accent,mb:0.5 }}>{p.name}</Typography>
              <Typography sx={{ fontSize:40,fontWeight:900,fontFamily:'Syne, sans-serif' }}>{annual?p.yr:p.mo}<Typography component="span" sx={{ fontSize:14,color:c.text3,fontWeight:500 }}>/mo</Typography></Typography>
              {annual && <Typography sx={{ fontSize:12,color:c.green,mb:1 }}>{p.yrTotal} — 3 months free</Typography>}
              <Typography sx={{ fontSize:13,color:c.text3,mb:2 }}>{p.desc}</Typography>
              {p.features.map(f => <Box key={f} sx={{ display:'flex',gap:1,py:0.5,fontSize:13,color:c.text2 }}><span style={{color:c.green}}>✓</span>{f}</Box>)}
              <Button fullWidth onClick={() => router.push(`/checkout?plan=${p.id}`)} sx={{ mt:3,bgcolor:p.pop?c.accent:c.glass2,color:p.pop?'#000':c.text2,fontWeight:700,fontSize:14,py:1.3,borderRadius:'10px',textTransform:'none','&:hover':{bgcolor:p.pop?c.accent2:c.glass3} }}>Start Free — 30 Days</Button>
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize:12,color:c.text3,mt:3 }}>All plans include 30-day free trial. No credit card required to start.</Typography>
      </Box>
    </Box>
  );
}
