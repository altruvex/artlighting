import { requirePermissionOrRedirect } from "@/lib/auth";
import { prisma } from "@repo/database";
import NewProductForm from "./new-product-form";

const NewProductPage = async () => {
  await requirePermissionOrRedirect("product:write");

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    // The selects need id/name/parentId; slug picks the product family.
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const topCategories = categories.filter((c) => c.parentId === null);
  const childCategories = categories.filter((c) => c.parentId !== null);

  return <NewProductForm topCategories={topCategories} childCategories={childCategories} />;
};

export default NewProductPage;
