'use client';
import { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

interface SignatureProps { onSave: (dataUrl: string) => void; onCancel: () => void; }

export function SignatureCanvas({ onSave, onCancel }: SignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.scale(2, 2); ctx.strokeStyle = '#1C1917'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    return { x: (touch as any).clientX - rect.left, y: (touch as any).clientY - rect.top };
  };

  const start = (e: any) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); const ctx = canvasRef.current?.getContext('2d'); const p = getPos(e); ctx?.beginPath(); ctx?.moveTo(p.x, p.y); };
  const move = (e: any) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); const p = getPos(e); ctx?.lineTo(p.x, p.y); ctx?.stroke(); };
  const end = () => setDrawing(false);
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); } setHasDrawn(false); };
  const save = () => { if (canvasRef.current) onSave(canvasRef.current.toDataURL('image/png')); };

  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: c.text, mb: 1 }}>חתימה</Typography>
      <Box sx={{ border: '2px solid ' + c.border, borderRadius: '10px', overflow: 'hidden', bgcolor: '#fff', mb: 1 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 150, touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={clear} sx={{ fontSize: 11 }}>נקה</Button>
        <Button size="small" onClick={onCancel} sx={{ fontSize: 11 }}>ביטול</Button>
        <Button size="small" variant="contained" onClick={save} disabled={!hasDrawn} sx={{ fontSize: 11 }}>שמור חתימה</Button>
      </Box>
    </Box>
  );
}
