import { zikkitColors as c } from '@/styles/theme';

const base = (content: string) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090B;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#00E5B0;color:#000;font-weight:900;font-size:16px;line-height:36px;text-align:center;">Zk</div>
    <span style="font-size:20px;font-weight:900;color:#e8f0f4;margin-left:8px;vertical-align:middle;">ZIKKIT</span>
  </div>
  <div style="background:#0f1318;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:28px 24px;">
    ${content}
  </div>
  <div style="text-align:center;margin-top:20px;font-size:11px;color:#5a7080;">
    Zikkit — AI-Powered Field Service Management<br/>
    <a href="https://zikkit.com/terms" style="color:#5a7080;">Terms</a> · <a href="https://zikkit.com/privacy" style="color:#5a7080;">Privacy</a>
  </div>
</div></body></html>`;

export const autoEmails = {
  welcome: (bizName: string, ownerName: string) => ({
    subject: `Welcome to Zikkit, ${ownerName}!`,
    html: base(`
      <h2 style="color:#e8f0f4;font-size:20px;margin:0 0 12px;">Welcome to Zikkit!</h2>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Hi ${ownerName}, your account for <strong>${bizName}</strong> is ready. You have 30 days to explore everything for free.
      </p>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">Here is what you can do right now:</p>
      <div style="margin:0 0 8px;color:#a8bcc8;font-size:13px;">✓ Set up your AI Voice Bot — it starts answering calls immediately</div>
      <div style="margin:0 0 8px;color:#a8bcc8;font-size:13px;">✓ Add your first technician</div>
      <div style="margin:0 0 8px;color:#a8bcc8;font-size:13px;">✓ Create your first job or quote</div>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://zikkit.com/dashboard" style="display:inline-block;padding:12px 32px;background:#00E5B0;color:#000;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">Go to Dashboard</a>
      </div>
    `),
  }),

  jobCompleted: (bizName: string, clientName: string, jobType: string, techName: string) => ({
    subject: `Job completed — ${jobType} for ${clientName}`,
    html: base(`
      <h2 style="color:#e8f0f4;font-size:18px;margin:0 0 12px;">Job Completed ✓</h2>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        <strong>${techName}</strong> has completed the job for <strong>${clientName}</strong>.
      </p>
      <div style="background:rgba(0,229,176,0.06);border:1px solid rgba(0,229,176,0.15);border-radius:10px;padding:14px;margin:0 0 16px;">
        <div style="color:#5a7080;font-size:11px;">Job Type</div>
        <div style="color:#e8f0f4;font-size:14px;font-weight:700;">${jobType}</div>
      </div>
      <div style="text-align:center;">
        <a href="https://zikkit.com/jobs" style="display:inline-block;padding:10px 24px;background:#00E5B0;color:#000;font-weight:700;font-size:13px;border-radius:10px;text-decoration:none;">View Job Details</a>
      </div>
    `),
  }),

  followUp: (bizName: string, clientName: string, clientEmail: string) => ({
    subject: `How was your service from ${bizName}?`,
    html: base(`
      <h2 style="color:#e8f0f4;font-size:18px;margin:0 0 12px;">Hi ${clientName},</h2>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Thank you for choosing <strong>${bizName}</strong>. We hope everything went well with your service.
      </p>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 20px;">
        If you have any questions or need anything else, do not hesitate to reach out. We are always here to help.
      </p>
      <p style="color:#5a7080;font-size:12px;margin:0;">— The ${bizName} Team</p>
    `),
  }),

  newLead: (bizName: string, callerPhone: string, issue: string) => ({
    subject: `New lead from AI Bot — ${callerPhone}`,
    html: base(`
      <h2 style="color:#e8f0f4;font-size:18px;margin:0 0 12px;">🤖 New Lead from AI Bot</h2>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your AI voice bot just captured a new lead.
      </p>
      <div style="background:rgba(79,143,255,0.06);border:1px solid rgba(79,143,255,0.15);border-radius:10px;padding:14px;margin:0 0 16px;">
        <div style="color:#5a7080;font-size:11px;">Phone</div>
        <div style="color:#e8f0f4;font-size:14px;font-weight:700;margin-bottom:8px;">${callerPhone}</div>
        <div style="color:#5a7080;font-size:11px;">Issue</div>
        <div style="color:#e8f0f4;font-size:14px;font-weight:700;">${issue}</div>
      </div>
      <div style="text-align:center;">
        <a href="https://zikkit.com/leads" style="display:inline-block;padding:10px 24px;background:#00E5B0;color:#000;font-weight:700;font-size:13px;border-radius:10px;text-decoration:none;">View Lead</a>
      </div>
    `),
  }),

  trialEnding: (ownerName: string, daysLeft: number) => ({
    subject: `${daysLeft} days left in your Zikkit trial`,
    html: base(`
      <h2 style="color:#e8f0f4;font-size:18px;margin:0 0 12px;">Hi ${ownerName},</h2>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your free trial ends in <strong style="color:#f59e0b;">${daysLeft} days</strong>. Subscribe now to keep your AI bot answering calls and your business running smoothly.
      </p>
      <p style="color:#a8bcc8;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Remember: without Zikkit, those missed calls go back to costing you thousands every month.
      </p>
      <div style="text-align:center;">
        <a href="https://zikkit.com/settings" style="display:inline-block;padding:12px 32px;background:#00E5B0;color:#000;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">Subscribe Now</a>
      </div>
    `),
  }),
};
