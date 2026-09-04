import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export async function encryptSecret(value: string) {
  if (!env.ENCRYPTION_KEY) throw new Error('Encryption is not configured');
  const keyBytes = Uint8Array.from(atob(env.ENCRYPTION_KEY), (char) =>
    char.charCodeAt(0),
  );
  if (keyBytes.byteLength !== 32)
    throw new Error('Encryption configuration is invalid');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'encrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(value),
    ),
  );
  return `${toBase64(iv)}.${toBase64(ciphertext)}`;
}
