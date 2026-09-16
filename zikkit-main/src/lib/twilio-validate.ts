import crypto from 'crypto';

/**
 * Validate Twilio webhook signature
 * Prevents forged requests to voice/sms endpoints
 */
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // console.warn('[Twilio] No TWILIO_AUTH_TOKEN set — skipping validation in dev');
    return process.env.NODE_ENV !== 'production';
  }
  if (!signature) return false;

  // Sort params and concatenate
  const data = url + Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], '');
  const computed = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  return computed === signature;
}

export function getTwilioValidationError(
  req: Request,
  url: string,
  params: Record<string, string>
): string | null {
  if (process.env.NODE_ENV !== 'production') return null; // Skip in dev
  const sig = req.headers.get('x-twilio-signature');
  if (!validateTwilioSignature(sig, url, params)) {
    return 'Invalid Twilio signature';
  }
  return null;
}
