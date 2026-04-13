import { spawn } from 'node:child_process';

function shouldRunMigrationsForBuild() {
  if (process.env.SKIP_DB_MIGRATE === '1') {
    return false;
  }

  if (process.env.MIGRATE_ON_BUILD === '1') {
    return true;
  }

  return process.env.VERCEL === '1' && process.env.VERCEL_GIT_COMMIT_REF === 'main';
}

if (!shouldRunMigrationsForBuild()) {
  console.log('Skipping database migrations for this build.');
  process.exit(0);
}

console.log('Running database migrations before build.');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', 'db:migrate'], {
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
