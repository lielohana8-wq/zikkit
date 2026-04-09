'use client';
import { useState, useRef } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { Close, CameraAlt, AddAPhoto } from '@mui/icons-material';
import { zikkitColors as c } from '@/styles/theme';

interface PhotoCaptureProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  max?: number;
}

export function PhotoCapture({ photos, onChange, label = 'תמונות', max = 10 }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (photos.length >= max) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 800px
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 800 / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          onChange([...photos, dataUrl]);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (idx: number) => onChange(photos.filter((_, i) => i !== idx));

  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#78716C', mb: '6px' }}>{label} ({photos.length}/{max})</Typography>
      <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <Box key={i} sx={{ position: 'relative', width: 72, height: 72, borderRadius: '8px', overflow: 'hidden', border: '1px solid ' + c.border }}>
            <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <IconButton size="small" onClick={() => removePhoto(i)} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: '#fff', width: 20, height: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <Close sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        ))}
        {photos.length < max && (
          <Box onClick={() => inputRef.current?.click()} sx={{
            width: 72, height: 72, borderRadius: '8px', border: '2px dashed ' + c.border, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
            '&:hover': { borderColor: c.accent, bgcolor: c.accentDim },
          }}>
            <AddAPhoto sx={{ fontSize: 20, color: c.text3 }} />
            <Typography sx={{ fontSize: 8, color: c.text3, mt: '2px' }}>הוסף</Typography>
          </Box>
        )}
      </Box>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={handleCapture} />
    </Box>
  );
}
