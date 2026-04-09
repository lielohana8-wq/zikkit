'use client';
import { useState, useRef } from 'react';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import { zikkitColors as c } from '@/styles/theme';
import { getFirebaseStorage, ref, uploadBytes, getDownloadURL } from '@/lib/firebase';

interface PhotoUploadProps {
  jobId: string | number;
  bizId: string;
  photos?: string[];
  onPhotosChange?: (urls: string[]) => void;
}

export function PhotoUpload({ jobId, bizId, photos = [], onPhotosChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<string[]>(photos);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const storage = getFirebaseStorage();
      const newUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) continue;
        const path = `jobs/${bizId}/${jobId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }
      const all = [...urls, ...newUrls];
      setUrls(all);
      onPhotosChange?.(all);
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const removePhoto = (idx: number) => {
    const updated = urls.filter((_, i) => i !== idx);
    setUrls(updated);
    onPhotosChange?.(updated);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        {urls.map((url, i) => (
          <Box key={i} sx={{ position: 'relative', width: 72, height: 72, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${c.border}` }}>
            <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <IconButton onClick={() => removePhoto(i)} sx={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, bgcolor: 'rgba(255,77,109,0.9)', color: '#fff', fontSize: 10, '&:hover': { bgcolor: c.hot } }}>x</IconButton>
          </Box>
        ))}
        <Box onClick={() => inputRef.current?.click()} sx={{ width: 72, height: 72, borderRadius: '10px', border: `2px dashed ${c.border2}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { borderColor: c.accent, bgcolor: c.accentDim } }}>
          {uploading ? <CircularProgress size={18} sx={{ color: c.accent }} /> : <>
            <Typography sx={{ fontSize: 20 }}>📷</Typography>
            <Typography sx={{ fontSize: 9, color: c.text3 }}>Add</Typography>
          </>}
        </Box>
      </Box>
      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" hidden onChange={handleUpload} />
    </Box>
  );
}
