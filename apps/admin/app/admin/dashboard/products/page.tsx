import DashboardHeader from "@/components/dashboard-header";
import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { prisma } from "@repo/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getFormatter, getTranslations } from "next-intl/server";
import BulkGenerateSheet from "./bulk-generate-sheet";

const ProductsPage = async () => {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) return notFound();
    throw err;
  }

  const [t, tCommon, format] = await Promise.all([
    getTranslations("Products"),
    getTranslations("Common"),
    getFormatter(),
  ]);

  const [products, topCategories] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        lightingtype: { select: { name: true } },
        variants: { where: { isDefault: true }, select: { stock: true } },
      },
    }),
    prisma.category.findMany({ where: { parentId: null }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={t("title")}>
        <div className="flex gap-2">
          <BulkGenerateSheet topCategories={topCategories} />
          <Button asChild size="sm">
            <Link href="/admin/dashboard/products/new">{t("newProduct")}</Link>
          </Button>
        </div>
      </DashboardHeader>
      <div className="mt-8">
        <Container>
          <h1 className="font-semibold text-lg mb-4">
            {t("heading", { count: products.length })}
          </h1>
          <div className="overflow-x-auto border rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.product")}</TableHead>
                  <TableHead>{t("columns.category")}</TableHead>
                  <TableHead>{tCommon("price")}</TableHead>
                  <TableHead>{t("columns.stock")}</TableHead>
                  <TableHead>{tCommon("status")}</TableHead>
                  <TableHead className="text-end">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="flex items-center gap-2">
                      {product.productImages[0] ? (
                        <Image
                          src={product.productImages[0]}
                          alt={product.productName}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted" />
                      )}
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.productId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category.name} / {product.lightingtype.name}
                    </TableCell>
                    <TableCell>{format.number(product.price, { style: "currency", currency: "EGP" })}</TableCell>
                    <TableCell>{product.variants[0]?.stock ?? product.quantity}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? tCommon("active") : tCommon("inactive")}
                        </Badge>
                        {product.featured && <Badge variant="outline">{t("featured")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/dashboard/products/${product.id}`}>{tCommon("edit")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default ProductsPage;
