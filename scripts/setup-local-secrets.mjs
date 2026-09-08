import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// Generated development credentials must never be committed or printed.
// Exclusive creation prevents replacing the key used by existing local records.
const target = new URL('../.dev.vars', import.meta.url);
try {
  await writeFile(
    target,
    `ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`,
    {
      flag: 'wx',
      mode: 0o600,
    },
  );
  console.log('Local encryption configured. Restart the development server.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Local configuration already exists; preserved without changes.');
}
