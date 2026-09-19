"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/lib/actions/products";

type Category = { id: string; name: string; slug: string; parentId: string | null };

export default function NewProductForm({
  topCategories,
  childCategories,
}: {
  topCategories: Category[];
  childCategories: Category[];
}) {
  const t = useTranslations("NewProduct");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("balcom");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState(topCategories[0]?.id ?? "");
  const [lightingtypeId, setLightingtypeId] = useState("");

  const availableChildren = childCategories.filter((c) => c.parentId === categoryId);
  const selectedTop = topCategories.find((c) => c.id === categoryId);
  const selectedChild = childCategories.find((c) => c.id === lightingtypeId);

  function handleSubmit() {
    if (!productId || !productName || !price || !categoryId || !lightingtypeId) {
      toast.error(t("errors.missingFields"));
      return;
    }
    if (!selectedTop || !selectedChild) {
      toast.error(t("errors.invalidCategory"));
      return;
    }

    startTransition(async () => {
      try {
        const product = await createProduct({
          productId,
          productName,
          brand,
          sectionType: selectedTop.slug,
          spotlightType: selectedChild.slug,
          categoryId,
          lightingtypeId,
          price: Number(price),
          quantity: Number(quantity),
        });
        toast.success(t("created"));
        router.push(`/admin/dashboard/products/${product.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errors.createFailed"));
      }
    });
  }

  return (
    <Container>
      <Card className="max-w-lg glass-surface rounded-2xl">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("sku")}</Label>
            <Input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder={t("skuPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("productName")}</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("brand")}</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balcom">Balcom</SelectItem>
                <SelectItem value="mister-led">Mister LED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setLightingtypeId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("subcategory")}</Label>
            <Select value={lightingtypeId} onValueChange={setLightingtypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("subcategoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {availableChildren.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>{t("price")}</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("initialStock")}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <Button disabled={isPending} onClick={handleSubmit} className="w-full">
            {t("create")}
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
