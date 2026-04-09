'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';
import { zikkitColors as c } from '@/styles/theme';

// ─── Types ───
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Page-aware quick suggestions ───
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': [
    'תן לי סיכום של העסק שלי היום',
    'How do I set a monthly revenue goal?',
    'מה המצב עם הלידים החמים?',
    'Show me my top performing technician',
  ],
  '/jobs': [
    'How do I close a job?',
    'איך משתמשים בBulk Actions?',
    'What do the priority colors mean?',
    'How is net profit calculated on close?',
  ],
  '/leads': [
    'How do I convert a lead to a job?',
    'מה זה Follow-up date?',
    'Explain lead statuses',
    'How to filter by source?',
  ],
  '/quotes': [
    'How do I duplicate a quote?',
    'How is tax calculated on quotes?',
    'איך הופכים ציטוט לעבודה?',
    'Explain quote statuses',
  ],
  '/products': [
    'How do I upload product images?',
    'איך מעלים מחירים ב-10%?',
    'How to import products from CSV?',
    'What is the margin column?',
  ],
  '/technicians': [
    'How to add a new technician?',
    'מה הסיסמא הראשונית לטכנאי?',
    'How to reset a tech password?',
    'What do the performance stats show?',
  ],
  '/reports': [
    'תן לי סיכום כספי החודש',
    'What periods can I filter by?',
    'How is profit margin calculated?',
    'Explain the tech performance section',
  ],
  '/payroll': [
    'How is commission calculated?',
    'איך מייצרים payslip?',
    'What time periods are available?',
    'How to use custom date range?',
  ],
  '/aibot': [
    'How do I set up the AI bot?',
    'What voices are available?',
    'How to create a conversation flow?',
    'How does the simulator work?',
  ],
  '/settings': [
    'How to change the tax rate?',
    'What currencies are supported?',
    'How to export my data?',
    'How to set monthly revenue goal?',
  ],
  '/users': [
    'What are the different roles?',
    'מה ההרשאות של כל תפקיד?',
    'How to reset a user password?',
    'Can I delete the owner account?',
  ],
  '/gps-tracking': [
    'How does GPS tracking work?',
    'What do the status colors mean?',
    'How do techs check in?',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'תן לי סיכום של העסק שלי',
  'How do I navigate this platform?',
  'What features does Zikkit have?',
  'Help me get started',
];

export function AIChatHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const { user } = useAuth();
  const { db, cfg } = useData();

  // Pulse animation when first load (no messages yet)
  const [showPulse, setShowPulse] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // ─── Build business context summary ───
  const businessContext = useMemo(() => {
    const jobs = db.jobs || [];
    const leads = db.leads || [];
    const quotes = db.quotes || [];
    const users = db.users || [];
    const products = db.products || [];
    const techs = users.filter((u) => u.role === 'tech' || u.role === 'technician');

    const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const openLeads = leads.filter((l) => !['converted', 'lost'].includes(l.status));
    const hotLeads = leads.filter((l) => l.status === 'hot');
    const monthRevenue = completedJobs
      .filter((j) => {
        if (!j.created) return false;
        const d = new Date(j.created);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, j) => s + (j.revenue || 0), 0);

    const overdueJobs = activeJobs.filter((j) => {
      const created = new Date(j.created || 0).getTime();
      return (Date.now() - created) > 48 * 60 * 60 * 1000;
    });

    const lines = [
      `Business: ${cfg.biz_name || 'Not set'}`,
      `Current user: ${user?.name || 'Unknown'} (${user?.role || 'unknown'})`,
      `Currency: ${cfg.currency || 'USD'}, Tax rate: ${cfg.tax_rate || 0}%`,
      `Current page: ${pathname}`,
      `---`,
      `Jobs: ${jobs.length} total, ${activeJobs.length} active, ${completedJobs.length} completed, ${overdueJobs.length} overdue`,
      `Leads: ${leads.length} total, ${openLeads.length} open, ${hotLeads.length} hot`,
      `Quotes: ${quotes.length} total`,
      `Technicians: ${techs.length}`,
      `Products: ${products.length}`,
      `Month revenue: $${monthRevenue.toLocaleString()}`,
    ];

    // Add tech summary
    if (techs.length > 0) {
      const techSummary = techs.map((t) => {
        const techJobs = completedJobs.filter((j) => j.tech === t.name);
        return `${t.name}: ${techJobs.length} jobs completed, ${t.commission || 0}% commission`;
      }).join('; ');
      lines.push(`Tech breakdown: ${techSummary}`);
    }

    return lines.join('\n');
  }, [db, cfg, user, pathname]);

  // ─── Get suggestions for current page ───
  const suggestions = useMemo(() => {
    return PAGE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS;
  }, [pathname]);

  // ─── Offline fallback for common questions ───
  const getOfflineAnswer = useCallback((text: string): string | null => {
    const q = text.toLowerCase();
    const jobs = db.jobs || [];
    const leads = db.leads || [];
    const techs = (db.users || []).filter((u) => u.role === 'tech' || u.role === 'technician');
    const completedJobs = jobs.filter((j) => j.status === 'completed');
    const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
    const monthJobs = completedJobs.filter((j) => {
      const d = new Date(j.created || 0);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthRev = monthJobs.reduce((s, j) => s + (j.revenue || 0), 0);
    const cur = cfg.currency || 'USD';
    const fmt = (n: number) => new Intl.NumberFormat(cur === 'ILS' ? 'he-IL' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

    // Business summary
    if (q.includes('סיכום') || q.includes('summary') || q.includes('overview') || q.includes('status') || q.includes('מצב')) {
      return `📊 Here's your business snapshot:\n\n• ${activeJobs.length} active jobs, ${completedJobs.length} completed\n• ${leads.filter((l) => !['converted','lost'].includes(l.status)).length} open leads (${leads.filter((l) => l.status === 'hot').length} hot)\n• ${(db.quotes || []).length} quotes\n• ${techs.length} technicians\n• Month revenue: ${fmt(monthRev)}\n\nNeed more details? Ask about a specific area!`;
    }

    // Close job
    if (q.includes('close') && q.includes('job') || q.includes('סגירת') || q.includes('לסגור')) {
      return `To close a job:\n\n1. Go to Jobs page\n2. Click "⋮ פעולות" on any open job\n3. Click "✅ סגור עבודה"\n4. Enter Revenue and Materials Cost\n5. The system auto-calculates: State Tax (${cfg.tax_rate || 0}%) + Tech Commission\n6. Add closing notes and click "סגור והשלם"\n\nThe net profit = Revenue - Materials - Tax - Commission`;
    }

    // Revenue goal
    if (q.includes('revenue goal') || q.includes('יעד') || q.includes('monthly goal')) {
      return `To set a Monthly Revenue Goal:\n\n1. Go to ⚙️ Settings\n2. Scroll to "Monthly Revenue Goal" field\n3. Enter your target amount\n4. Click "Save Settings"\n\nThe progress bar will appear on your Dashboard showing your pace vs the goal.`;
    }

    // Bulk actions
    if (q.includes('bulk') || q.includes('מרובה') || q.includes('multiple')) {
      return `Bulk Actions in Jobs:\n\n1. Use the checkboxes on the left of each row\n2. Select multiple jobs\n3. A green bar appears: "X selected"\n4. Click "⚡ Bulk Actions"\n5. Choose: שנה סטטוס, Assign Tech, or Delete\n\nAll selected jobs will be updated at once!`;
    }

    // Add technician
    if ((q.includes('add') && q.includes('tech')) || q.includes('הוספת טכנאי') || q.includes('new technician')) {
      return `To add a technician:\n\n1. Go to 👷 Technicians page\n2. Click "+ Add Technician"\n3. Fill in: Name, Email, Phone, ZIP, Commission %\n4. Default password is: Tech1234!\n5. On first login, they'll be required to set a new password\n\nYou can reset their password anytime with the 🔑 button.`;
    }

    // Convert lead
    if (q.includes('convert') && q.includes('lead') || q.includes('להמיר') || q.includes('lead to job')) {
      return `To convert a lead to a job:\n\n1. Go to 👥 Leads page\n2. Click "⋮ פעולות" on the lead\n3. Click "🔧 המר לעבודה"\n4. A new job is created with the lead's info\n5. The lead status changes to "Converted"\n\nYou can also do this from the lead's edit modal.`;
    }

    // Duplicate quote
    if (q.includes('duplicate') && q.includes('quote') || q.includes('שכפול')) {
      return `To duplicate a quote:\n\n1. Go to 📄 Quotes page\n2. Click "⋮ פעולות" on any quote\n3. Click "📋 Duplicate Quote"\n4. A new draft copy is created with all the same items\n5. Edit the copy as needed`;
    }

    // Tax
    if (q.includes('tax') || q.includes('מס') || q.includes('tax rate')) {
      return `Tax rate is configured in ⚙️ Settings.\n\nCurrent tax rate: ${cfg.tax_rate || 0}%\n\nThis is applied to:\n• Quote totals (Subtotal × tax%)\n• סגור עבודה calculation (Revenue × tax%)\n\nTo change: Settings → Tax Rate → Save`;
    }

    // Product images
    if (q.includes('image') || q.includes('תמונ') || q.includes('photo') || q.includes('upload')) {
      return `To add product images:\n\n1. Go to 📦 Price List\n2. Click on a product or "+ Add Product"\n3. At the top of the modal, click "📤 Upload Image"\n4. Select a PNG/JPG file (max 500KB)\n5. Preview appears immediately\n6. Click "Remove" to delete the image\n\nImages appear as thumbnails in the product table.`;
    }

    // Password / login
    if (q.includes('password') || q.includes('סיסמ') || q.includes('reset') || q.includes('forgot')) {
      return `Password management:\n\n• **Forgot Password**: On login screen, click "Forgot Password?" → enter email → get reset link\n• **Reset by Owner**: In Technicians page, click 🔑 button. In Users page, use Actions → "Reset Password"\n• **First Login**: New users must set a new password on first login (default: Tech1234!)`;
    }

    // Roles
    if (q.includes('role') || q.includes('permission') || q.includes('תפקיד') || q.includes('הרשא')) {
      return `User Roles & Permissions:\n\n👑 **Owner** — Full access to everything\n📋 **Manager** — Edit jobs, prices, view reports\n📞 **Dispatcher** — Edit jobs only\n👷 **Technician** — View assigned jobs only\n\nManage roles in 🔐 User Management page.`;
    }

    // Features list
    if (q.includes('feature') || q.includes('what can') || q.includes('מה אפשר') || q.includes('help') || q.includes('get started')) {
      return `Zikkit features:\n\n📊 Dashboard — KPIs, trends, revenue goal\n🔧 Jobs — Full lifecycle with 11 statuses\n👥 Leads/CRM — Track & convert prospects\n📄 Quotes — Estimates with line items\n📦 Price List — Products with images\n👷 Technicians — Performance tracking\n💰 Payroll — Commission calculations\n📈 Reports — Financial analytics\n🤖 AI Bot — Voice assistant config\n🗺️ GPS — Tech location tracking\n\nAsk me about any specific feature!`;
    }

    // Top tech
    if (q.includes('top') && (q.includes('tech') || q.includes('טכנאי')) || q.includes('best') || q.includes('performance')) {
      if (techs.length === 0) return 'You don\'t have any technicians yet. Add them in the 👷 Technicians page.';
      const techStats = techs.map((t) => {
        const tj = completedJobs.filter((j) => j.tech === t.name);
        return { name: t.name, jobs: tj.length, rev: tj.reduce((s, j) => s + (j.revenue || 0), 0) };
      }).sort((a, b) => b.rev - a.rev);
      const top = techStats[0];
      if (!top || top.jobs === 0) return 'אין עבודות שהושלמו ע"י טכנאים yet. Data will appear once jobs are closed.';
      return `🏆 Top technician: **${top.name}**\n• ${top.jobs} jobs completed\n• ${fmt(top.rev)} revenue generated\n\nAll techs:\n${techStats.map((t, i) => `${i + 1}. ${t.name}: ${t.jobs} jobs, ${fmt(t.rev)}`).join('\n')}`;
    }

    // Hot leads
    if (q.includes('hot') || q.includes('חם') || q.includes('lead')) {
      const hot = leads.filter((l) => l.status === 'hot');
      if (hot.length === 0) return 'No hot leads right now. Mark leads as "hot" in the Leads page to track them.';
      return `🔥 You have ${hot.length} hot lead${hot.length > 1 ? 's' : ''}:\n\n${hot.slice(0, 5).map((l) => `• **${l.name}** — ${l.phone || l.email || 'no contact'}`).join('\n')}\n\nGo to 👥 Leads to manage them.`;
    }

    // Navigation
    if (q.includes('where') || q.includes('how to find') || q.includes('navigate') || q.includes('איפה')) {
      return `Use the sidebar on the left to navigate between pages. Each icon leads to a different section. On mobile, use the bottom navigation bar.\n\nQuick tip: The Dashboard gives you an overview of everything. Click on any card to dive deeper.`;
    }

    return null; // No match — will try API
  }, [db, cfg, pathname]);

  // ─── Send message ───
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setHasError(false);

    // Try offline answer first for instant response
    const offlineAnswer = getOfflineAnswer(text);

    try {
      // Build API messages (last 20 for context window)
      const apiMessages = [...messages, userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, businessContext }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        // API failed — use offline answer if available
        if (offlineAnswer) {
          const assistantMsg: ChatMessage = {
            id: 'msg_' + Date.now() + '_ai',
            role: 'assistant',
            content: offlineAnswer,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
        return;
      }

      const assistantMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_ai',
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      // API failed — try offline answer
      if (offlineAnswer) {
        const assistantMsg: ChatMessage = {
          id: 'msg_' + Date.now() + '_ai',
          role: 'assistant',
          content: offlineAnswer,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setHasError(true);
        const errorMsg: ChatMessage = {
          id: 'msg_' + Date.now() + '_err',
          role: 'assistant',
          content: '⚠️ AI service is not available right now. Try asking about: closing jobs, adding technicians, lead conversion, tax settings, bulk actions, or any feature — I have built-in answers for common questions!',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, businessContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([]);
    setHasError(false);
  };

  return (
    <>
      {/* ══ Floating Button ══ */}
      {!isOpen && (
        <Box
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 900,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00e5b0, #00a882)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,229,176,0.35), 0 0 0 1px rgba(0,229,176,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            animation: showPulse ? 'chatPulse 2s infinite' : 'none',
            '&:hover': {
              transform: 'scale(1.08) translateY(-2px)',
              boxShadow: '0 12px 40px rgba(0,229,176,0.45), 0 0 0 1px rgba(0,229,176,0.4)',
            },
            '@keyframes chatPulse': {
              '0%': { boxShadow: '0 8px 32px rgba(0,229,176,0.35), 0 0 0 0 rgba(0,229,176,0.3)' },
              '70%': { boxShadow: '0 8px 32px rgba(0,229,176,0.35), 0 0 0 12px rgba(0,229,176,0)' },
              '100%': { boxShadow: '0 8px 32px rgba(0,229,176,0.35), 0 0 0 0 rgba(0,229,176,0)' },
            },
            '@media(max-width:600px)': {
              bottom: 80,
              right: 16,
              width: 50,
              height: 50,
            },
          }}
        >
          <Typography sx={{ fontSize: 24, lineHeight: 1 }}>🤖</Typography>
        </Box>
      )}

      {/* ══ Chat Panel ══ */}
      {isOpen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 900,
            width: 400,
            maxWidth: 'calc(100vw - 32px)',
            height: 560,
            maxHeight: 'calc(100vh - 100px)',
            bgcolor: c.surface1,
            border: `1px solid ${c.border2}`,
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: `0 0 0 1px ${c.border}, 0 25px 80px rgba(0,0,0,0.6), 0 0 60px -10px rgba(0,229,176,0.15)`,
            animation: 'chatOpen 0.35s cubic-bezier(0.16,1,0.3,1)',
            '@keyframes chatOpen': {
              from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
              to: { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
            '@media(max-width:600px)': {
              bottom: 0,
              right: 0,
              width: '100vw',
              maxWidth: '100vw',
              height: '100vh',
              maxHeight: '100vh',
              borderRadius: 0,
            },
          }}
        >
          {/* ── Header ── */}
          <Box
            sx={{
              p: '14px 18px',
              borderBottom: `1px solid ${c.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(0,229,176,0.06), rgba(79,143,255,0.04))',
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00e5b0, #00a882)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0,229,176,0.3)',
              }}
            >
              🤖
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '-0.3px' }}>
                Zikkit AI Helper
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                <Typography sx={{ fontSize: 10, color: c.text3 }}>Online — Ready to help</Typography>
              </Box>
            </Box>
            {messages.length > 0 && (
              <IconButton size="small" onClick={clearChat}
                sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.warm, bgcolor: 'rgba(245,158,11,0.1)' } }}>
                <Typography sx={{ fontSize: 12 }}>🗑️</Typography>
              </IconButton>
            )}
            <IconButton size="small" onClick={() => setIsOpen(false)}
              sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.hot, bgcolor: c.hotDim } }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>

          {/* ── Messages Area ── */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              '&::-webkit-scrollbar': { width: '3px' },
              '&::-webkit-scrollbar-thumb': { background: c.border2, borderRadius: '99px' },
            }}
          >
            {/* Welcome message if empty */}
            {messages.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: '20px', gap: '14px' }}>
                <Box sx={{
                  width: 52, height: 52, borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(0,229,176,0.12), rgba(79,143,255,0.08))',
                  border: '1px solid rgba(0,229,176,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  👋
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, mb: '4px' }}>
                    Hey {user?.name?.split(' ')[0] || 'there'}!
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: c.text3, lineHeight: 1.6, maxWidth: 280 }}>
                    I&apos;m your AI assistant. Ask me anything about the platform or your business data.
                  </Typography>
                </Box>

                {/* Suggestions */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', mt: '6px' }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 700, color: c.text3, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                    Quick Questions
                  </Typography>
                  {suggestions.map((s, i) => (
                    <Box
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      sx={{
                        p: '9px 14px',
                        bgcolor: 'rgba(255,255,255,0.025)',
                        border: '1px solid ' + c.border,
                        borderRadius: '10px',
                        fontSize: 12,
                        color: c.text2,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: 'rgba(0,229,176,0.06)',
                          borderColor: 'rgba(0,229,176,0.2)',
                          color: c.accent,
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      💬 {s}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '85%',
                    p: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    bgcolor: msg.role === 'user'
                      ? 'rgba(0,229,176,0.1)'
                      : 'rgba(255,255,255,0.035)',
                    border: '1px solid ' + (msg.role === 'user'
                      ? 'rgba(0,229,176,0.2)'
                      : c.border),
                    animation: 'msgIn 0.2s ease',
                    '@keyframes msgIn': {
                      from: { opacity: 0, transform: `translateY(8px) translateX(${msg.role === 'user' ? '8px' : '-8px'})` },
                      to: { opacity: 1, transform: 'translateY(0) translateX(0)' },
                    },
                  }}
                >
                  {msg.role === 'assistant' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', mb: '4px' }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.accent }}>🤖 Zikkit AI</Typography>
                    </Box>
                  )}
                  <Typography
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.65,
                      color: msg.role === 'user' ? c.text : c.text2,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      '& strong': { color: c.text, fontWeight: 700 },
                    }}
                  >
                    {msg.content}
                  </Typography>
                  <Typography sx={{ fontSize: 9, color: c.text3, mt: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box sx={{
                  p: '12px 16px', borderRadius: '14px 14px 14px 4px',
                  bgcolor: 'rgba(255,255,255,0.035)', border: '1px solid ' + c.border,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <Box key={i} sx={{
                        width: 6, height: 6, borderRadius: '50%', bgcolor: c.accent,
                        animation: 'dotPulse 1.4s infinite',
                        animationDelay: `${i * 0.2}s`,
                        '@keyframes dotPulse': {
                          '0%, 80%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                          '40%': { opacity: 1, transform: 'scale(1)' },
                        },
                      }} />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: c.text3 }}>Thinking...</Typography>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* ── Suggestions bar (when conversation active) ── */}
          {messages.length > 0 && messages.length < 6 && !isLoading && (
            <Box sx={{
              px: '14px', py: '6px', borderTop: '1px solid ' + c.border,
              display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0,
              '&::-webkit-scrollbar': { height: '2px' },
            }}>
              {suggestions.slice(0, 3).map((s, i) => (
                <Box key={i} onClick={() => handleSuggestionClick(s)} sx={{
                  px: '10px', py: '4px', borderRadius: '8px', fontSize: 10, fontWeight: 600,
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid ' + c.border,
                  color: c.text3, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'rgba(0,229,176,0.06)', color: c.accent, borderColor: 'rgba(0,229,176,0.2)' },
                }}>
                  {s}
                </Box>
              ))}
            </Box>
          )}

          {/* ── Input Area ── */}
          <Box
            sx={{
              p: '12px 14px',
              borderTop: '1px solid ' + c.border,
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              flexShrink: 0,
              bgcolor: 'rgba(0,0,0,0.15)',
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: c.surface3,
                  borderRadius: '12px',
                  fontSize: 12,
                  '& fieldset': { borderColor: c.border2 },
                  '&:hover fieldset': { borderColor: c.border3 },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(0,229,176,0.4)', boxShadow: '0 0 0 3px rgba(0,229,176,0.08)' },
                },
                '& .MuiInputBase-input': { p: '10px 14px', color: c.text },
                '& .MuiInputBase-input::placeholder': { color: c.text3, opacity: 1 },
              }}
            />
            <IconButton
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: input.trim() ? 'linear-gradient(135deg, #00e5b0, #00a882)' : c.glass2,
                background: input.trim() ? 'linear-gradient(135deg, #00e5b0, #00a882)' : c.glass2,
                color: input.trim() ? '#000' : c.text3,
                transition: 'all 0.2s',
                flexShrink: 0,
                '&:hover': input.trim() ? {
                  background: 'linear-gradient(135deg, #00e5b0, #00a882)',
                  filter: 'brightness(1.1)',
                  transform: 'scale(1.05)',
                } : {},
                '&.Mui-disabled': { bgcolor: c.glass2, color: c.text3 },
              }}
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* ── Footer ── */}
          <Box sx={{ p: '6px 14px 8px', textAlign: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 9, color: c.text3 }}>
              Powered by Claude AI · Zikkit Helper v1.0
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
}
