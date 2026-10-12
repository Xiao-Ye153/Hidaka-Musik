import crypto from 'crypto';

const SECRET = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
const UA = 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0';
const BASES = ['https://media.savetube.vip', 'https://media.savetube.me'];
const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'https://yt.savetube.me',
  'User-Agent': UA
};

export const QUALITIES = [92, 128, 256, 320];

export function decrypt(enc: string) {
  const data = Buffer.from(enc, 'base64');
  const iv = data.subarray(0, 16);
  const content = data.subarray(16);
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(SECRET, 'hex'), iv);
  const out = Buffer.concat([decipher.update(content), decipher.final()]);
  return JSON.parse(out.toString());
}

export function describeError(e: unknown) {
  if (!(e instanceof Error)) return 'Gagal';
  const cause = (e as { cause?: { code?: string; message?: string } }).cause;
  const detail = cause?.code || cause?.message;
  return detail ? `${e.message} (${detail})` : e.message;
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`${label}: ${describeError(e)}`);
  }
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(9000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getCdn(): Promise<string> {
  let last: unknown = new Error('tidak ada server');
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}/api/random-cdn`, {
        headers: HEADERS,
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.cdn) return String(data.cdn);
      throw new Error('cdn kosong');
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export async function resolveAudio(videoId: string, quality = 128) {
  const cdn = await step('cdn', getCdn);

  const info = await step('info', async () => {
    const r = await postJson(`https://${cdn}/v2/info`, {
      url: `https://www.youtube.com/watch?v=${videoId}`
    });
    return decrypt(r.data);
  });

  const link = await step('download', async () => {
    const r = await postJson(`https://${cdn}/download`, {
      id: videoId,
      downloadType: 'audio',
      quality: String(quality),
      key: info.key
    });
    const url: string | undefined = r?.data?.downloadUrl;
    if (!url) throw new Error('link kosong');
    return url;
  });

  return { url: link, title: String(info.title || '') };
}
