'use client';
import { Box, IconButton, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  
  useEffect(() => {
    const saved = localStorage.getItem('zk-theme');
    if (saved === 'light') { setDark(false); document.body.classList.add('light-mode'); }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) { document.body.classList.remove('light-mode'); localStorage.setItem('zk-theme', 'dark'); }
    else { document.body.classList.add('light-mode'); localStorage.setItem('zk-theme', 'light'); }
  };

  return (
    <Tooltip title={dark ? 'מצב בהיר' : 'מצב כהה'}>
      <IconButton onClick={toggle} size="small" sx={{ color: dark ? '#F59E0B' : '#3B82F6' }}>
        {dark ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
      </IconButton>
    </Tooltip>
  );
}
