'use client';

import { useState, useRef } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { useData } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/useToast';

export function LogoUpload() {
  const { cfg, saveCfg } = useData();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(cfg.logo_url || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Only images allowed', '#ff4d6d'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('Max 2MB', '#ff4d6d'); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Resize to max 150px to keep base64 small for Firestore
      const resized = await resizeImage(dataUrl, 150);
      setPreview(resized);
      await saveCfg({ logo_url: resized });
      toast('Logo saved!');
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast('Upload failed', '#ff4d6d');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    await saveCfg({ logo_url: '' });
    setPreview(null);
    toast('Logo removed');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {preview ? (
        <Box component="img" src={preview} alt="Logo" sx={{ width: 64, height: 64, borderRadius: '12px', objectFit: 'cover', border: `1px solid ${c.border}` }} />
      ) : (
        <Box onClick={() => inputRef.current?.click()} sx={{ width: 64, height: 64, borderRadius: '12px', bgcolor: c.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: c.accent, border: `1px dashed ${c.accentMid}`, cursor: 'pointer', '&:hover': { borderColor: c.accent } }}>
          {(cfg.biz_name || 'Z').charAt(0).toUpperCase()}
        </Box>
      )}
      <Box>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden onChange={handleUpload} />
        <Button size="small" onClick={() => inputRef.current?.click()} disabled={uploading} sx={{ fontSize: 12, fontWeight: 600, color: c.accent, textTransform: 'none', mr: 1 }}>
          {uploading ? <CircularProgress size={14} sx={{ color: c.accent }} /> : preview ? 'Change' : 'Upload'}
        </Button>
        {preview && <Button size="small" onClick={handleRemove} sx={{ fontSize: 12, color: c.text3, textTransform: 'none' }}>Remove</Button>}
        <Typography sx={{ fontSize: 11, color: c.text3, mt: 0.5 }}>PNG/JPG, max 2MB</Typography>
      </Box>
    </Box>
  );
}

function resizeImage(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}
