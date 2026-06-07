'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Chip } from '@mui/material';
import { useParams } from 'next/navigation';

interface PortalData {
  bizId: string;
  leadId: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  service: string;
  preferredDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'new' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assignedToName?: string;
  assignedToPhone?: string;
  createdAt: string;
  notes?: string;
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: 'הפנייה התקבלה', color: '#4F46E5', icon: '📥' },
  scheduled: { label: 'נקבע מועד', color: '#059669', icon: '📅' },
  in_progress: { label: 'הטכנאי בדרך', color: '#F59E0B', icon: '🚗' },
  completed: { label: 'הושלם', color: '#059669', icon: '✓' },
  cancelled: { label: 'בוטל', color: '#E11D48', icon: '✕' },
};

export default function CustomerPortal() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPortal();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchPortal, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchPortal = async () => {
    try {
      const res = await fetch(`/api/portal/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'שגיאה');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FCFBF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#4F46E5' }} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FCFBF9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Box sx={{ fontSize: 64, mb: 2 }}>🔍</Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#1C1917', mb: 1 }}>
            {'לא נמצא'}
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#57534E' }}>
            {error || 'הקישור לא חוקי או פג תוקפו'}
          </Typography>
        </Box>
      </Box>
    );
  }

  const statusInfo = STATUS_INFO[data.status] || STATUS_INFO.new;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FCFBF9', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontSize: 13, color: '#A8A29E', mb: 0.5 }}>
            {'פנייה אצל'}
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#1C1917' }}>
            {data.businessName}
          </Typography>
        </Box>

        {/* Status card */}
        <Box
          sx={{
            bgcolor: '#fff',
            border: `2px solid ${statusInfo.color}`,
            borderRadius: 4,
            p: 4,
            mb: 3,
            textAlign: 'center',
          }}
        >
          <Box sx={{ fontSize: 56, mb: 2 }}>{statusInfo.icon}</Box>
          <Chip
            label={statusInfo.label}
            sx={{
              bgcolor: statusInfo.color,
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              py: 2.5,
              px: 1,
              mb: 2,
            }}
          />
          <Typography sx={{ fontSize: 14, color: '#57534E', lineHeight: 1.7 }}>
            {data.status === 'new' && 'הפנייה שלך התקבלה. הצוות יחזור אליך בקרוב.'}
            {data.status === 'scheduled' && 'נקבע מועד. הטכנאי יגיע במועד שנקבע.'}
            {data.status === 'in_progress' && 'הטכנאי בדרך אליך. הוא יגיע בקרוב.'}
            {data.status === 'completed' && 'העבודה הושלמה. תודה שבחרתם בנו!'}
            {data.status === 'cancelled' && 'הפנייה בוטלה. אם זה בטעות צרו קשר.'}
          </Typography>
        </Box>

        {/* Details card */}
        <Box sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4, p: 3, mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}>
            {'פרטי הפנייה'}
          </Typography>

          <Detail label="שם הלקוח" value={data.customerName} />
          {data.service && <Detail label="שירות" value={data.service} />}

          {data.scheduledDate && data.scheduledTime && (
            <Detail
              label="מועד שנקבע"
              value={`${formatHebrewDate(data.scheduledDate)} בשעה ${data.scheduledTime}`}
              highlight
            />
          )}

          {!data.scheduledDate && data.preferredDate && (
            <Detail label="מועד מועדף" value={data.preferredDate} />
          )}

          {data.assignedToName && (
            <Detail label="שובץ לטכנאי" value={data.assignedToName} highlight />
          )}

          {data.notes && <Detail label="הערות" value={data.notes} />}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {data.assignedToPhone && (
            <Button
              href={`tel:${data.assignedToPhone}`}
              variant="contained"
              fullWidth
              sx={{
                py: 2,
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 3,
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#3730A3' },
              }}
            >
              {'📞 התקשר ל'} {data.assignedToName}
            </Button>
          )}

          <Button
            onClick={fetchPortal}
            variant="outlined"
            fullWidth
            sx={{ py: 1.5, fontSize: 13, fontWeight: 600, borderRadius: 3 }}
          >
            {'🔄 רענן סטטוס'}
          </Button>
        </Box>

        {/* Footer */}
        <Typography sx={{ textAlign: 'center', mt: 4, fontSize: 11, color: '#A8A29E' }}>
          {'מופעל ע"י Zikkit'}
        </Typography>
      </Box>
    </Box>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <Typography sx={{ fontSize: 13, color: '#57534E' }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: highlight ? 800 : 600, color: highlight ? '#4F46E5' : '#1C1917' }}>
        {value}
      </Typography>
    </Box>
  );
}

function formatHebrewDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    return `יום ${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}
