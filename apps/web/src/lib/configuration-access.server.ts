import "server-only";
import { prisma } from "@repo/database";
import { auth } from "@/lib/auth-server";
import { ownsConfiguration, readGuestToken } from "@/lib/guest-token";

/**
 * The id of a configuration the current visitor may change, or null.
 *
 * The server actions behind the product page's options — IP, bulb, colour,
 * "order now" — took a configuration id from the browser and wrote to that
 * row without asking whose it was. Configuration ids are cuids, which leak
 * their creation order, so another customer's row was a guess away. Every
 * one of those actions now goes through this first, and a row that is not
 * the visitor's answers exactly like one that does not exist.
 */
export async function editableConfigurationId(configId: string): Promise<string | null> {
  if (typeof configId !== "string" || configId.length === 0 || configId.length > 64) return null;
  const [{ userId }, guestToken, row] = await Promise.all([
    auth(),
    readGuestToken(),
    prisma.configuration.findUnique({
      where: { id: configId },
      select: { id: true, userId: true, guestToken: true },
    }),
  ]);
  if (!row || !ownsConfiguration(row, { userId, guestToken })) return null;
  return row.id;
}
