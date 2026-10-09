import crypto from 'crypto';

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1423887033036082';

function hashSha256(val: string): string {
  if (!val) return '';
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export interface ServerEventPayload {
  eventName: string;
  eventId: string;
  sourceUrl?: string;
  user?: {
    phone?: string;
    email?: string;
    name?: string;
    clientIp?: string;
    clientUserAgent?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
  };
}

export async function sendMetaServerEvent(payload: ServerEventPayload) {
  const token = process.env.META_ACCESS_TOKEN || process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || META_PIXEL_ID;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!token) {
    console.log('ℹ️ META_ACCESS_TOKEN не задано, пропуск серверного CAPI.');
    return;
  }

  const phoneDigits = payload.user?.phone ? payload.user.phone.replace(/\D/g, '') : '';
  const normalizedPhone = phoneDigits ? (phoneDigits.startsWith('380') ? phoneDigits : `38${phoneDigits}`) : '';

  const userData: Record<string, any> = {
    client_ip_address: payload.user?.clientIp || undefined,
    client_user_agent: payload.user?.clientUserAgent || undefined,
  };

  if (normalizedPhone) {
    userData.ph = [hashSha256(normalizedPhone)];
  }
  if (payload.user?.email) {
    userData.em = [hashSha256(payload.user.email)];
  }
  if (payload.user?.name) {
    userData.fn = [hashSha256(payload.user.name.split(' ')[0] || '')];
    userData.ln = [hashSha256(payload.user.name.split(' ').slice(1).join(' ') || '')];
  }

  const bodyData: Record<string, any> = {
    data: [
      {
        event_name: payload.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: payload.eventId,
        event_source_url: payload.sourceUrl || 'https://urbangrid.com.ua',
        action_source: 'website',
        user_data: userData,
        custom_data: payload.customData,
      },
    ],
  };

  if (testEventCode) {
    bodyData.test_event_code = testEventCode;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    const resJson = await res.json();
    console.log('📡 Meta CAPI result:', resJson);
  } catch (err) {
    console.error('Meta CAPI error:', err);
  }
}
