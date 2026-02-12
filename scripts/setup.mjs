#!/usr/bin/env node

/**
 * Project setup script for fullstack-starter.
 *
 * Automates the initial setup when someone clones the starter:
 *   1. Validates prerequisites (Node, pnpm, Docker)
 *   2. Prompts for project name and derives naming variants
 *   3. Renames project references across config files
 *   4. Copies .env example files
 *   5. Installs dependencies
 *   6. Sets up database (Docker + Prisma)
 *   7. Optionally seeds demo data
 *
 * Usage: pnpm setup
 *
 * Zero external dependencies — uses only Node.js built-ins.
 */

import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';

// ============================================================
// Constants
// ============================================================

const ROOT = resolve(import.meta.dirname, '..');
const PROJECT_NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const ORIGINAL_NAME = 'fullstack-starter';

// ============================================================
// Color helpers (follows sync-starter.js style)
// ============================================================

function color(text, code) {
  if (!process.stdout.isTTY) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

const fmt = {
  ok: (t) => color(t, '32'),
  warn: (t) => color(t, '33'),
  err: (t) => color(t, '31'),
  dim: (t) => color(t, '90'),
  bold: (t) => color(t, '1'),
  cyan: (t) => color(t, '36'),
};

function logStep(step, emoji, msg) {
  output.write(`\n${fmt.dim(`[${step}]`)} ${emoji} ${msg}\n`);
}

function logInfo(msg) {
  output.write(`  ${fmt.dim('→')} ${msg}\n`);
}

function logSuccess(msg) {
  output.write(`  ${fmt.ok('✓')} ${msg}\n`);
}

function logWarn(msg) {
  output.write(`  ${fmt.warn('⚠')} ${msg}\n`);
}

function logError(msg) {
  output.write(`  ${fmt.err('✗')} ${msg}\n`);
}

function die(msg) {
  output.write(`\n${fmt.err('❌')} ${msg}\n\n`);
  process.exit(1);
}

// ============================================================
// SIGINT handler
// ============================================================

process.on('SIGINT', () => {
  output.write(`\n\n${fmt.warn('⚠')} Setup cancelled by user.\n\n`);
  process.exit(130);
});

// ============================================================
// Utility: run a command
// ============================================================

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
    cwd: opts.cwd ?? ROOT,
    ...opts,
  });

  return {
    code: res.status ?? -1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
    ok: res.status === 0,
    error: res.error,
  };
}

function runVisible(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: 'inherit',
    cwd: opts.cwd ?? ROOT,
    ...opts,
  });

  return {
    code: res.status ?? -1,
    ok: res.status === 0,
    error: res.error,
  };
}

// ============================================================
// Naming helpers
// ============================================================

function toKebab(name) {
  return name;
}

function toUnderscore(name) {
  return name.replace(/-/g, '_');
}

function toPascalCase(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toTitleCase(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================
// Step 1: Validate prerequisites
// ============================================================

function validatePrerequisites() {
  logStep('1/7', '🔍', 'Validating prerequisites...');

  // Node >= 18
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major < 18) {
    die(`Node.js >= 18 is required. Current version: ${nodeVersion}`);
  }
  logSuccess(`Node.js ${nodeVersion}`);

  // pnpm installed
  const pnpm = run('pnpm', ['--version']);
  if (!pnpm.ok) {
    die('pnpm is not installed. Install it with: npm install -g pnpm');
  }
  logSuccess(`pnpm ${pnpm.stdout}`);

  // Docker (soft fail)
  const docker = run('docker', ['info']);
  const dockerAvailable = docker.ok;
  if (dockerAvailable) {
    logSuccess('Docker is running');
  } else {
    logWarn('Docker is not running. Database setup will be skipped.');
  }

  return { dockerAvailable };
}

// ============================================================
// Step 2: Prompt for project name
// ============================================================

async function promptProjectName(rl) {
  logStep('2/7', '📝', 'Project configuration');

  // Detect if already renamed
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const currentName = pkg.name;

  if (currentName !== ORIGINAL_NAME) {
    logInfo(`Project already renamed to ${fmt.bold(currentName)}`);
    const answer = await rl.question(
      `  ${fmt.dim('?')} Keep current name "${currentName}"? (Y/n) `,
    );
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed || trimmed === 'y' || trimmed === 'yes') {
      return currentName;
    }
  }

  while (true) {
    const name = await rl.question(
      `  ${fmt.dim('?')} Project name (kebab-case, e.g. my-saas-app): `,
    );
    const trimmed = name.trim();

    if (!trimmed) {
      logWarn('Project name cannot be empty.');
      continue;
    }

    if (!PROJECT_NAME_REGEX.test(trimmed)) {
      logWarn(
        'Invalid name. Use kebab-case: lowercase letters, numbers, hyphens. Must start with a letter.',
      );
      continue;
    }

    return trimmed;
  }
}

// ============================================================
// Step 3: Rename project references
// ============================================================

function renameReferences(projectName) {
  logStep('3/7', '✏️', 'Renaming project references...');

  const kebab = toKebab(projectName);
  const underscore = toUnderscore(projectName);
  const title = toTitleCase(projectName);

  logInfo(
    `Variants: ${fmt.cyan(kebab)} | ${fmt.cyan(underscore)} | ${fmt.cyan(title)}`,
  );

  const replacements = [
    // Root package.json — name field
    {
      file: 'package.json',
      replacements: [
        { from: `"name": "${ORIGINAL_NAME}"`, to: `"name": "${kebab}"` },
      ],
    },
    // Root docker-compose.yml — container names + db name
    {
      file: 'docker-compose.yml',
      replacements: [
        {
          from: 'container_name: fullstack-db',
          to: `container_name: ${kebab}-db`,
        },
        {
          from: 'container_name: fullstack-redis',
          to: `container_name: ${kebab}-redis`,
        },
        {
          from: 'container_name: fullstack-api',
          to: `container_name: ${kebab}-api`,
        },
        {
          from: 'container_name: fullstack-client',
          to: `container_name: ${kebab}-client`,
        },
        {
          from: 'POSTGRES_DB:-fullstack_db',
          to: `POSTGRES_DB:-${underscore}_db`,
        },
      ],
    },
    // API docker-compose.yml — container names + db name + network
    {
      file: join('apps', 'api', 'docker-compose.yml'),
      replacements: [
        {
          from: 'container_name: b2b-api-db',
          to: `container_name: ${kebab}-api-db`,
        },
        {
          from: 'container_name: b2b-api-redis',
          to: `container_name: ${kebab}-api-redis`,
        },
        { from: 'POSTGRES_DB:-b2b_db', to: `POSTGRES_DB:-${underscore}_db` },
        { from: 'b2b-network', to: `${kebab}-network`, all: true },
      ],
    },
    // API .env.example — db name
    {
      file: join('apps', 'api', '.env.example'),
      replacements: [
        { from: 'myapp_db', to: `${underscore}_db`, all: true },
        {
          from: 'SWAGGER_TITLE=API Documentation',
          to: `SWAGGER_TITLE=${title} API`,
        },
        {
          from: 'SWAGGER_DESCRIPTION=Fullstack TypeScript API',
          to: `SWAGGER_DESCRIPTION=${title} API`,
        },
      ],
    },
    // API .env.development — db name + swagger
    {
      file: join('apps', 'api', '.env.development'),
      replacements: [
        { from: 'b2b_db', to: `${underscore}_db`, all: true },
        {
          from: 'SWAGGER_TITLE=B2B API - Development',
          to: `SWAGGER_TITLE=${title} API - Development`,
        },
        {
          from: 'SWAGGER_DESCRIPTION=Sistema SaaS B2B para comerciantes y proveedores',
          to: `SWAGGER_DESCRIPTION=${title} API`,
        },
      ],
    },
    // packages/config/src/env.config.ts — Swagger defaults
    {
      file: join('packages', 'config', 'src', 'env.config.ts'),
      replacements: [
        {
          from: "SWAGGER_TITLE: z.string().default('B2B API')",
          to: `SWAGGER_TITLE: z.string().default('${title} API')`,
        },
        {
          from: "SWAGGER_DESCRIPTION: z\n    .string()\n    .default('B2B SaaS system for merchants and suppliers')",
          to: `SWAGGER_DESCRIPTION: z\n    .string()\n    .default('${title} API')`,
        },
      ],
    },
    // apps/api/src/config/config.service.ts — Swagger fallbacks
    {
      file: join('apps', 'api', 'src', 'config', 'config.service.ts'),
      replacements: [
        {
          from: "'SWAGGER_TITLE', 'B2B API'",
          to: `'SWAGGER_TITLE', '${title} API'`,
        },
        {
          from: "'SWAGGER_DESCRIPTION',\n        'API for B2B platform for merchants and suppliers',",
          to: `'SWAGGER_DESCRIPTION',\n        '${title} API',`,
        },
      ],
    },
    // apps/api/src/main.ts — startup message
    {
      file: join('apps', 'api', 'src', 'main.ts'),
      replacements: [
        {
          from: '   B2B API started successfully',
          to: `   ${title} API started successfully`,
        },
      ],
    },
    // apps/api/init-db.sql — comment
    {
      file: join('apps', 'api', 'init-db.sql'),
      replacements: [
        {
          from: '-- B2B API - NestJS + Prisma',
          to: `-- ${title} API - NestJS + Prisma`,
        },
      ],
    },
  ];

  let totalReplacements = 0;

  for (const { file, replacements: rules } of replacements) {
    const filePath = join(ROOT, file);
    if (!existsSync(filePath)) {
      logWarn(`File not found, skipping: ${file}`);
      continue;
    }

    let content = readFileSync(filePath, 'utf8');
    let fileChanged = false;

    for (const rule of rules) {
      if (rule.all) {
        const count = content.split(rule.from).length - 1;
        if (count > 0) {
          content = content.replaceAll(rule.from, rule.to);
          fileChanged = true;
          totalReplacements += count;
        }
      } else {
        if (content.includes(rule.from)) {
          content = content.replace(rule.from, rule.to);
          fileChanged = true;
          totalReplacements++;
        }
      }
    }

    if (fileChanged) {
      writeFileSync(filePath, content, 'utf8');
      logSuccess(`Updated ${file}`);
    } else {
      logInfo(`No changes needed: ${file}`);
    }
  }

  logInfo(`${totalReplacements} replacement(s) applied.`);
}

// ============================================================
// Step 4: Copy .env files
// ============================================================

async function copyEnvFiles(rl, projectName) {
  logStep('4/7', '📄', 'Setting up environment files...');

  const underscore = toUnderscore(projectName);

  const envMappings = [
    {
      source: join('apps', 'api', '.env.example'),
      target: join('apps', 'api', '.env'),
      transforms: [
        { from: 'myapp_db', to: `${underscore}_db`, all: true },
      ],
    },
    {
      source: join('apps', 'client', '.env.example'),
      target: join('apps', 'client', '.env.local'),
      transforms: [],
    },
  ];

  for (const mapping of envMappings) {
    const sourcePath = join(ROOT, mapping.source);
    const targetPath = join(ROOT, mapping.target);

    if (!existsSync(sourcePath)) {
      logWarn(`Source not found, skipping: ${mapping.source}`);
      continue;
    }

    if (existsSync(targetPath)) {
      const answer = await rl.question(
        `  ${fmt.dim('?')} ${mapping.target} already exists. Overwrite? (y/N) `,
      );
      const trimmed = answer.trim().toLowerCase();
      if (trimmed !== 'y' && trimmed !== 'yes') {
        logInfo(`Skipped ${mapping.target}`);
        continue;
      }
    }

    if (mapping.transforms.length > 0) {
      let content = readFileSync(sourcePath, 'utf8');
      for (const t of mapping.transforms) {
        if (t.all) {
          content = content.replaceAll(t.from, t.to);
        } else {
          content = content.replace(t.from, t.to);
        }
      }
      writeFileSync(targetPath, content, 'utf8');
    } else {
      copyFileSync(sourcePath, targetPath);
    }

    logSuccess(`Created ${mapping.target}`);
  }
}

// ============================================================
// Step 5: Install dependencies
// ============================================================

function installDependencies() {
  logStep('5/7', '📦', 'Installing dependencies...');

  const res = runVisible('pnpm', ['install']);
  if (!res.ok) {
    die('Failed to install dependencies. Check the output above for errors.');
  }

  logSuccess('Dependencies installed');
}

// ============================================================
// Step 6: Database setup
// ============================================================

function detectDockerCompose() {
  // Try modern "docker compose" first
  const modern = run('docker', ['compose', 'version']);
  if (modern.ok) return ['docker', 'compose'];

  // Fall back to legacy "docker-compose"
  const legacy = run('docker-compose', ['version']);
  if (legacy.ok) return ['docker-compose'];

  return null;
}

function waitForHealthy(composeCmd, service, timeoutMs = 30000) {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < timeoutMs) {
    const res = run('docker', [
      'inspect',
      '--format',
      '{{.State.Health.Status}}',
      service,
    ]);

    if (res.ok && res.stdout.trim() === 'healthy') {
      return true;
    }

    spawnSync('sleep', ['2'], { stdio: 'ignore' });
  }

  return false;
}

function setupDatabase(dockerAvailable, projectName) {
  logStep('6/7', '🗄️', 'Setting up database...');

  if (!dockerAvailable) {
    logWarn('Docker is not available. Skipping database setup.');
    logInfo('Run "pnpm db:up" later when Docker is running.');
    return false;
  }

  const composeCmd = detectDockerCompose();
  if (!composeCmd) {
    logWarn('Docker Compose not found. Skipping database setup.');
    return false;
  }

  const composeCmdName = composeCmd.join(' ');
  logInfo(`Using ${fmt.cyan(composeCmdName)}`);

  // Start db and redis containers
  logInfo('Starting database containers...');
  const composeFile = join('apps', 'api', 'docker-compose.yml');
  const upArgs = [
    ...composeCmd.slice(1),
    '-f',
    composeFile,
    'up',
    '-d',
    'db',
    'redis',
  ];

  const up = runVisible(composeCmd[0], upArgs);
  if (!up.ok) {
    logError('Failed to start containers. You can try manually: pnpm db:up');
    return false;
  }

  // Wait for db to be healthy
  const kebab = toKebab(projectName);
  const dbContainer = `${kebab}-api-db`;
  logInfo(`Waiting for database to be healthy (${dbContainer})...`);

  const healthy = waitForHealthy(composeCmd, dbContainer);
  if (!healthy) {
    logWarn('Database healthcheck timed out (30s). Continuing anyway...');
  } else {
    logSuccess('Database is healthy');
  }

  // Generate Prisma client
  logInfo('Generating Prisma client...');
  const generate = runVisible('pnpm', ['--filter', 'api', 'run', 'prisma:generate']);
  if (!generate.ok) {
    logError('Failed to generate Prisma client.');
    return false;
  }
  logSuccess('Prisma client generated');

  // Run migrations
  logInfo('Running database migrations...');
  const migrate = runVisible('pnpm', ['--filter', 'api', 'run', 'prisma:migrate']);
  if (!migrate.ok) {
    logError('Failed to run migrations. You can try manually: pnpm --filter api run prisma:migrate');
    return false;
  }
  logSuccess('Migrations applied');

  return true;
}

// ============================================================
// Step 7: Optional seed
// ============================================================

async function optionalSeed(rl, dbReady) {
  logStep('7/7', '🌱', 'Demo data');

  if (!dbReady) {
    logInfo('Database not set up. Skipping seed.');
    return;
  }

  const answer = await rl.question(
    `  ${fmt.dim('?')} Seed database with demo data? (y/N) `,
  );
  const trimmed = answer.trim().toLowerCase();

  if (trimmed !== 'y' && trimmed !== 'yes') {
    logInfo('Skipping seed.');
    return;
  }

  logInfo('Seeding database...');
  const res = runVisible('pnpm', ['--filter', 'api', 'run', 'prisma:seed']);
  if (!res.ok) {
    logError('Seed failed. You can try manually: pnpm --filter api run prisma:seed');
    return;
  }
  logSuccess('Database seeded');
}

// ============================================================
// Success message
// ============================================================

function printSuccess(projectName, dockerAvailable) {
  const title = toTitleCase(projectName);
  const border = '═'.repeat(52);

  output.write(`
${fmt.ok(`╔${border}╗`)}
${fmt.ok('║')}${' '.repeat(52)}${fmt.ok('║')}
${fmt.ok('║')}   ${fmt.bold(`${title} is ready!`)}${' '.repeat(Math.max(0, 48 - title.length - 10))}${fmt.ok('║')}
${fmt.ok('║')}${' '.repeat(52)}${fmt.ok('║')}
${fmt.ok(`╚${border}╝`)}

  ${fmt.bold('Next steps:')}

  ${fmt.cyan('pnpm dev')}             Start all apps
  ${fmt.cyan('pnpm dev:api')}         Start API only
  ${fmt.cyan('pnpm dev:client')}      Start client only
`);

  if (!dockerAvailable) {
    output.write(`  ${fmt.warn('⚠')} Don't forget to start Docker and run:
  ${fmt.cyan('pnpm db:up')}           Start database containers
  ${fmt.cyan('pnpm --filter api run prisma:migrate')}  Run migrations
`);
  }

  output.write(`
  ${fmt.bold('URLs:')}
  ${fmt.dim('API')}:     http://localhost:3000/api/v1
  ${fmt.dim('Client')}:  http://localhost:3001
  ${fmt.dim('Docs')}:    http://localhost:3000/api/docs
  ${fmt.dim('Studio')}:  Run ${fmt.cyan('pnpm db:studio')} → http://localhost:5556

`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  output.write(`
${fmt.bold('🚀 Fullstack Starter — Project Setup')}
${fmt.dim('─'.repeat(44))}
`);

  // Step 1
  const { dockerAvailable } = validatePrerequisites();

  // Step 2
  const rl = createInterface({ input, output });
  let projectName;
  try {
    projectName = await promptProjectName(rl);
  } catch {
    // Handle Ctrl+C during readline
    rl.close();
    process.exit(130);
  }

  logInfo(
    `Using: ${fmt.bold(projectName)} → ${fmt.cyan(toKebab(projectName))} | ${fmt.cyan(toUnderscore(projectName))} | ${fmt.cyan(toTitleCase(projectName))}`,
  );

  // Step 3
  renameReferences(projectName);

  // Step 4
  try {
    await copyEnvFiles(rl, projectName);
  } catch {
    rl.close();
    process.exit(130);
  }

  // Step 5
  installDependencies();

  // Step 6
  const dbReady = setupDatabase(dockerAvailable, projectName);

  // Step 7
  try {
    await optionalSeed(rl, dbReady);
  } catch {
    // Ignore readline close errors
  }

  rl.close();

  // Done!
  printSuccess(projectName, dockerAvailable);
}

main().catch((err) => {
  die(`Unexpected error: ${err?.message ?? String(err)}`);
});
