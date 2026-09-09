import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.DATABASE_URL) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('Applying pending database migrations...');
  run(npmCommand, ['run', 'db:migrate']);
} else {
  console.warn(
    'DATABASE_URL is not set; skipping migrations for this local build.',
  );
}

run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
