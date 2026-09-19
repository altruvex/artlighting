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
import { formatPrice } from "@/lib/utils";
import BulkGenerateSheet from "./bulk-generate-sheet";

const ProductsPage = async () => {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) return notFound();
    throw err;
  }

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
      <DashboardHeader Route="Products">
        <div className="flex gap-2">
          <BulkGenerateSheet topCategories={topCategories} />
          <Button asChild size="sm">
            <Link href="/admin/dashboard/products/new">New product</Link>
          </Button>
        </div>
      </DashboardHeader>
      <div className="mt-8">
        <Container>
          <h1 className="font-semibold text-lg mb-4">
            Products ({products.length})
          </h1>
          <div className="overflow-x-auto border rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell>{product.variants[0]?.stock ?? product.quantity}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {product.featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/dashboard/products/${product.id}`}>Edit</Link>
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
