/**
 * Resets an Admin's password. The password is typed at a hidden prompt
 * (twice), hashed with Better Auth's own hashPassword, and never printed,
 * logged or stored anywhere else. All of that admin's sessions are signed
 * out so the old password stops working everywhere at once.
 *
 *   pnpm --filter @repo/database reset:admin-password <email>
 *
 * Targets whatever DATABASE_URL resolves to (.env.local → dev). For
 * production, set DATABASE_URL to the production URL and
 * ALLOW_PRODUCTION_WRITES=1; the host is printed before anything is written.
 */
import { createInterface } from "node:readline";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prisma } from "../index";
import { assertNotProduction, databaseUrl, hostOf, isProductionHost, loadEnv } from "../load-env";

// Better Auth's default emailAndPassword limits.
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/** Reads a line from a terminal in raw mode, echoing nothing. */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const done = (err?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done();
        if (ch === "\u0003" || ch === "\u0004") return done(new Error("Cancelled. Nothing changed."));
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

/** Non-terminal input (piped): one line per answer. */
let pipedLines: Promise<string[]> | undefined;
async function askPiped(index: number): Promise<string> {
  pipedLines ??= (async () => {
    const lines: string[] = [];
    for await (const line of createInterface({ input: process.stdin })) lines.push(line);
    return lines;
  })();
  return (await pipedLines)[index] ?? "";
}

async function main() {
  loadEnv();
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: reset-admin-password <email>");

  const url = databaseUrl();
  assertNotProduction(url);
  console.log(`Database: ${hostOf(url)}${isProductionHost(url) ? "  (PRODUCTION)" : ""}`);

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) throw new Error(`No admin with email ${email}`);

  const account = await prisma.adminAccount.findFirst({
    where: { adminId: admin.id, providerId: "credential" },
  });
  if (!account) throw new Error(`${email} has no email/password login to reset`);

  const tty = Boolean(process.stdin.isTTY);
  const password = tty ? await askHidden("New password: ") : await askPiped(0);
  const confirm = tty ? await askHidden("Repeat password: ") : await askPiped(1);
  if (password !== confirm) throw new Error("Passwords do not match. Nothing changed.");
  if (password.length < MIN_LENGTH || password.length > MAX_LENGTH) {
    throw new Error(`Password must be ${MIN_LENGTH}-${MAX_LENGTH} characters. Nothing changed.`);
  }

  const hash = await hashPassword(password);
  if (!(await verifyPassword({ hash, password }))) throw new Error("Hash check failed. Nothing changed.");

  const [, sessions] = await prisma.$transaction([
    prisma.adminAccount.update({ where: { id: account.id }, data: { password: hash } }),
    prisma.adminSession.deleteMany({ where: { adminId: admin.id } }),
  ]);

  console.log(`Password reset for ${email}. Signed out ${sessions.count} session(s).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
