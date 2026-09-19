import { requireAdminOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import NewProductForm from "./new-product-form";

const NewProductPage = async () => {
  await requireAdminOrRedirect();

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
  });
  const topCategories = categories.filter((c) => c.parentId === null);
  const childCategories = categories.filter((c) => c.parentId !== null);

  return <NewProductForm topCategories={topCategories} childCategories={childCategories} />;
};

export default NewProductPage;
