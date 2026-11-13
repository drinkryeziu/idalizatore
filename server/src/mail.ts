// Transactional email. Set RESEND_API_KEY and MAIL_FROM to send for real; otherwise messages are logged (development).
export const outbox: { to: string; subject: string; text: string }[] = [];

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.MAIL_OUTBOX === '1') outbox.push({ to, subject, text });
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[mail to ${to}] ${subject}\n${text}`); return; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'Idealizator <no-reply@example.com>', to, subject, text }),
    });
    if (!res.ok) console.error('[mail] provider', res.status);
  } catch (e: any) { console.error('[mail] failed', e?.message); }
}
