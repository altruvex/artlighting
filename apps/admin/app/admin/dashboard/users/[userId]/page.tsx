import { notFound } from "next/navigation";
import UserClient from "./user-client";
import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";

const UserPage = async ({ params }: { params: Promise<{ userId: string }> }) => {
  await requireAdminOrRedirect();
  const resolvedParams = await params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: resolvedParams.userId,
      },
      include: {
        shippingAddress: true,
        product: true,
        orders: {
          where: {
            isCompleted: true,
          },
          include: {
            product: true,
            configuration: true,
            shippingAddress: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    if (!user) {
      return notFound();
    }
    return <UserClient user={user} />;
  } catch (error) {
    console.error("Error fetching user:", error);
    const t = await getTranslations("CustomerDetail");
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        {t("loadError")}
      </div>
    );
  }
};

export default UserPage;
