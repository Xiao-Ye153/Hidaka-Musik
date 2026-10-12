import crypto from 'crypto';

const SECRET = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
const UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

export const QUALITIES = [92, 128, 256, 320];

export function decrypt(enc: string) {
  const data = Buffer.from(enc, 'base64');
  const iv = data.subarray(0, 16);
  const content = data.subarray(16);
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(SECRET, 'hex'), iv);
  const out = Buffer.concat([decipher.update(content), decipher.final()]);
  return JSON.parse(out.toString());
}

async function postJson(url: string, body: unknown, referer: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Referer: referer },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(9000)
  });
  if (!res.ok) throw new Error(`SaveTube ${res.status}`);
  return res.json();
}

export async function resolveAudio(videoId: string, quality = 128) {
  const cdnRes = await fetch('https://media.savetube.me/api/random-cdn', {
    headers: { 'User-Agent': UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(9000)
  });
  if (!cdnRes.ok) throw new Error(`SaveTube cdn ${cdnRes.status}`);
  const { cdn } = await cdnRes.json();
  if (!cdn) throw new Error('SaveTube cdn kosong');

  const info = decrypt(
    (
      await postJson(
        `https://${cdn}/v2/info`,
        { url: `https://youtube.com/watch?v=${videoId}` },
        'https://yt.savetube.me/1kejjj1?id=362796039'
      )
    ).data
  );

  const dl = await postJson(
    `https://${cdn}/download`,
    { downloadType: 'audio', quality: String(quality), key: info.key },
    'https://yt.savetube.me/start-download?from=1kejjj1%3Fid%3D362796039'
  );

  const url: string | undefined = dl?.data?.downloadUrl;
  if (!url) throw new Error('SaveTube tidak memberi link');
  return { url, title: String(info.title || '') };
}
