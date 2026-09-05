import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

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

export async function decryptSecret(value: string) {
  if (!env.ENCRYPTION_KEY) throw new Error('Encryption is not configured');
  const [ivValue, ciphertextValue] = value.split('.');
  if (!ivValue || !ciphertextValue)
    throw new Error('Encrypted value is invalid');
  const keyBytes = fromBase64(env.ENCRYPTION_KEY);
  if (keyBytes.byteLength !== 32)
    throw new Error('Encryption configuration is invalid');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'decrypt',
  ]);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivValue) },
    key,
    fromBase64(ciphertextValue),
  );
  return new TextDecoder().decode(plaintext);
}

export async function stableExternalId(workspaceId: string, value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${workspaceId}:outreach:${value}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
