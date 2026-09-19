import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import UsersClient from "./users-client";

const Users = async () => {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) return notFound();
    throw err;
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        shippingAddress: {
          select: {
            fullName: true,
            phoneNumber: true,
            address: true,
          },
        },
        orders: {
          select: {
            isCompleted: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return <UsersClient users={users} />;
  } catch (error) {
    console.error("Error fetching users:", error);
    return <div>Error loading customers</div>;
  }
};

export default Users;
