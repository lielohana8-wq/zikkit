interface EmailParams {
  to: string;
  bizName: string;
  customerName?: string;
  jobId?: string;
  portalUrl?: string;
}

export function welcomeEmail({ to, bizName }: EmailParams) {
  return {
    to,
    subject: `Welcome to Zikkit — ${bizName} is ready!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#07090B;color:#e8f0f4;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:#00E5B0;line-height:40px;font-weight:900;color:#000;font-size:18px">Zk</div>
        </div>
        <h1 style="font-size:22px;font-weight:800;text-align:center;margin-bottom:8px">Welcome to Zikkit!</h1>
        <p style="color:#a8bcc8;font-size:14px;line-height:1.7;text-align:center">
          Your account for <strong style="color:#e8f0f4">${bizName}</strong> is ready. Your AI voice bot is set up and ready to answer calls 24/7.
        </p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://zikkit.com/dashboard" style="display:inline-block;padding:12px 32px;background:#00E5B0;color:#000;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px">Go to Dashboard</a>
        </div>
        <p style="color:#5a7080;font-size:12px;text-align:center">Your 30-day free trial has started. No credit card needed.</p>
      </div>
    `,
  };
}

export function jobCompletedEmail({ to, bizName, customerName, jobId, portalUrl }: EmailParams) {
  return {
    to,
    subject: `Job #${jobId} completed — ${bizName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#07090B;color:#e8f0f4;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:#00E5B0;line-height:40px;font-weight:900;color:#000;font-size:18px">Zk</div>
        </div>
        <h1 style="font-size:20px;font-weight:800;text-align:center;margin-bottom:8px">Job Completed</h1>
        <p style="color:#a8bcc8;font-size:14px;line-height:1.7;text-align:center">
          Hi ${customerName || 'there'}, your job #${jobId} with <strong style="color:#e8f0f4">${bizName}</strong> has been completed.
        </p>
        ${portalUrl ? `<div style="text-align:center;margin:24px 0"><a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#00E5B0;color:#000;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px">View Receipt</a></div>` : ''}
        <p style="color:#5a7080;font-size:12px;text-align:center">Thank you for choosing ${bizName}!</p>
      </div>
    `,
  };
}

export function followUpEmail({ to, bizName, customerName }: EmailParams) {
  return {
    to,
    subject: `How was your experience? — ${bizName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#07090B;color:#e8f0f4;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:#00E5B0;line-height:40px;font-weight:900;color:#000;font-size:18px">Zk</div>
        </div>
        <h1 style="font-size:20px;font-weight:800;text-align:center;margin-bottom:8px">Everything working well?</h1>
        <p style="color:#a8bcc8;font-size:14px;line-height:1.7;text-align:center">
          Hi ${customerName || 'there'}, we wanted to check in and make sure everything is working perfectly after our recent service. If you have any issues, please do not hesitate to contact us.
        </p>
        <p style="color:#5a7080;font-size:12px;text-align:center;margin-top:24px">— ${bizName} Team</p>
      </div>
    `,
  };
}

export function trialEndingEmail({ to, bizName }: EmailParams) {
  return {
    to,
    subject: `Your Zikkit trial ends in 3 days`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#07090B;color:#e8f0f4;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:#00E5B0;line-height:40px;font-weight:900;color:#000;font-size:18px">Zk</div>
        </div>
        <h1 style="font-size:20px;font-weight:800;text-align:center;margin-bottom:8px">Your trial ends soon</h1>
        <p style="color:#a8bcc8;font-size:14px;line-height:1.7;text-align:center">
          Your 30-day free trial for <strong style="color:#e8f0f4">${bizName}</strong> ends in 3 days. Subscribe now to keep your AI voice bot answering calls.
        </p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://zikkit.com/settings" style="display:inline-block;padding:12px 32px;background:#00E5B0;color:#000;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px">Subscribe Now</a>
        </div>
        <p style="color:#5a7080;font-size:12px;text-align:center">Without a subscription, your bot will stop answering calls and you will lose access to the platform.</p>
      </div>
    `,
  };
}
