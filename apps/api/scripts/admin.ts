/**
 * Manage admin accounts. There is no public sign-up; admins are created here.
 *
 *   npm run admin -w @reactive-store/api -- create   <email> "<name>"
 *   npm run admin -w @reactive-store/api -- password <email>
 *   npm run admin -w @reactive-store/api -- disable  <email>
 *   npm run admin -w @reactive-store/api -- enable   <email>
 *   npm run admin -w @reactive-store/api -- list
 *
 * The password is asked for without echoing it. For scripts (e.g. a first deploy),
 * set ADMIN_PASSWORD instead. Changing a password or disabling an admin signs them
 * out everywhere.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ADMIN_PASSWORD_MIN } from '@reactive-store/shared';
import argon2 from 'argon2';
import { createInterface } from 'node:readline';
import { PrismaClient } from '../src/generated/prisma/client.js';

const [command, rawEmail, ...nameParts] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
const usage = 'Usage: npm run admin -w @reactive-store/api -- <create|password|disable|enable|list> [email] ["name"]';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Reads a line from the terminal without showing what is typed. */
function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let prompted = false;
  output._writeToOutput = (s: string) => {
    if (!prompted) {
      output.output.write(s);
      prompted = true;
    }
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function newPassword(): Promise<string> {
  const fromEnv = process.env['ADMIN_PASSWORD'];
  const password = fromEnv ?? (await askHidden(`New password (at least ${ADMIN_PASSWORD_MIN} characters): `));
  if (password.length < ADMIN_PASSWORD_MIN) fail(`The password must be at least ${ADMIN_PASSWORD_MIN} characters.`);
  if (!fromEnv && (await askHidden('Repeat the password: ')) !== password) fail('The passwords do not match.');
  return argon2.hash(password);
}

const connectionString = process.env['DATABASE_URL'] ?? fail('DATABASE_URL is not set (see apps/api/.env).');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function signOutEverywhere(adminUserId: string) {
  await prisma.refreshToken.updateMany({ where: { adminUserId, revokedAt: null }, data: { revokedAt: new Date() } });
}

async function findOrFail(address: string | undefined) {
  if (!address) fail(usage);
  return (await prisma.adminUser.findUnique({ where: { email: address } })) ?? fail(`No admin with email ${address}.`);
}

try {
  switch (command) {
    case 'create': {
      const name = nameParts.join(' ').trim();
      if (!email || !name) fail('Usage: npm run admin -w @reactive-store/api -- create <email> "<name>"');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" doesn't look like an email address.`);
      if (await prisma.adminUser.findUnique({ where: { email } })) fail(`An admin with email ${email} already exists.`);
      const passwordHash = await newPassword();
      await prisma.adminUser.create({ data: { email, name, passwordHash } });
      console.log(`Created admin ${name} <${email}>.`);
      break;
    }
    case 'password': {
      const admin = await findOrFail(email);
      const passwordHash = await newPassword();
      await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });
      await signOutEverywhere(admin.id);
      console.log(`Password changed for ${admin.email}. They have been signed out everywhere.`);
      break;
    }
    case 'disable':
    case 'enable': {
      const admin = await findOrFail(email);
      await prisma.adminUser.update({ where: { id: admin.id }, data: { isActive: command === 'enable' } });
      if (command === 'disable') await signOutEverywhere(admin.id);
      console.log(`${admin.email} is now ${command === 'enable' ? 'enabled' : 'disabled and signed out'}.`);
      break;
    }
    case 'list': {
      const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
      if (!admins.length) console.log('No admins yet. Create one with the "create" command.');
      for (const a of admins) {
        const last = a.lastLoginAt ? a.lastLoginAt.toISOString().slice(0, 16).replace('T', ' ') : 'never';
        console.log(`${a.isActive ? '  active  ' : '  disabled'}  ${a.email.padEnd(32)} ${a.name.padEnd(24)} last sign-in: ${last}`);
      }
      break;
    }
    default:
      fail(usage);
  }
} finally {
  await prisma.$disconnect();
}
