import { requireAdminOrRedirect } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * The Better Auth session (via requireAdminOrRedirect) is the real auth
 * check now — there's no separate password-reverification step anymore
 * (that used to compare against Admin.hashedPassword, which no longer
 * exists post-Clerk removal). If you're here and authenticated, go straight
 * to the dashboard.
 */
const RootPage = async () => {
  await requireAdminOrRedirect();
  redirect("/dashboard");
};

export default RootPage;
