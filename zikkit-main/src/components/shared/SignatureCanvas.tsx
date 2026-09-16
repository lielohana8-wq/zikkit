'use client';
import { useRef, useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export function SignatureCanvas({ onSave, width = 400, height = 160 }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FAF7F4';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e8f0f4';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FAF7F4';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature || !canvasRef.current) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: c.text3, mb: 1 }}>Sign below</Typography>
      <canvas
        ref={canvasRef} width={width} height={height}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{ width: '100%', maxWidth: width, height: 'auto', aspectRatio: `${width}/${height}`, borderRadius: 10, border: `1px solid ${c.border2}`, touchAction: 'none', cursor: 'crosshair' }}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button size="small" onClick={clear} sx={{ fontSize: 11, color: c.text3, textTransform: 'none' }}>Clear</Button>
        <Button size="small" onClick={save} disabled={!hasSignature} sx={{ fontSize: 11, color: c.accent, textTransform: 'none', fontWeight: 700 }}>Confirm Signature</Button>
      </Box>
    </Box>
  );
}
