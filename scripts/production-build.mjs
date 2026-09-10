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

// Database migrations are an operational step, not a compile step. Some hosting
// build networks cannot reach managed Postgres poolers, which would make an
// otherwise healthy application deployment fail. Opt in only in environments
// that explicitly support migration access during builds.
if (process.env.DATABASE_URL && process.env.RUN_DATABASE_MIGRATIONS === 'true') {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('Applying pending database migrations...');
  run(npmCommand, ['run', 'db:migrate']);
} else {
  console.log('Skipping database migrations during application build.');
}

run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
