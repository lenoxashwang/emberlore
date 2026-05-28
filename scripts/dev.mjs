import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function run(scriptPath, label) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.stdout.write(`${label} exited with code ${code ?? 0}\n`);
  });

  return child;
}

const frontend = run(path.join(projectRoot, 'frontend', 'server.mjs'), 'frontend');
const backend = run(path.join(projectRoot, 'backend', 'server.mjs'), 'backend');

function shutdown() {
  frontend.kill('SIGTERM');
  backend.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
