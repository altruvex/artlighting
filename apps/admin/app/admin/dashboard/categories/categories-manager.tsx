"use client";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategory, moveCategory, updateCategory } from "@/lib/actions/categories";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CornerDownRightIcon,
  FolderTreeIcon,
  PencilIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type CategoryWithCount = {
  id: string;
  name: string;
  /** Name in the current UI language, when a translation row exists. */
  localizedName: string | null;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  _count: { products: number; subProducts: number };
};

export default function CategoriesManager({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const router = useRouter();
  const t = useTranslations("Categories");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("__top__");

  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editActive, setEditActive] = useState(true);

  const sections = categories.filter((category) => category.parentId === null);

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("genericError"));
      }
    });
  }

  function openEditor(category: CategoryWithCount) {
    setEditing(category);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditActive(category.isActive);
  }

  /**
   * Row controls, scoped to the row's own sibling list. A plain render
   * function rather than a nested component: a component declared here would
   * get a new identity every render and drop focus mid-interaction.
   */
  function rowControls(category: CategoryWithCount, index: number, siblings: number) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isPending || index === 0}
          aria-label={`${t("moveUp")} — ${category.name}`}
          onClick={() => run(() => moveCategory(category.id, "up"), t("toasts.movedUp"))}
        >
          <ArrowUpIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isPending || index === siblings - 1}
          aria-label={`${t("moveDown")} — ${category.name}`}
          onClick={() => run(() => moveCategory(category.id, "down"), t("toasts.movedDown"))}
        >
          <ArrowDownIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isPending}
          aria-label={t("edit", { name: category.name })}
          onClick={() => openEditor(category)}
        >
          <PencilIcon className="size-3.5" />
        </Button>
      </>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-3 lg:order-1">
        {sections.length === 0 ? (
          <div className="rounded-lg border">
            <EmptyState
              icon={FolderTreeIcon}
              title={t("empty.title")}
              description={t("empty.description")}
            />
          </div>
        ) : (
          sections.map((section, sectionIndex) => {
            const children = categories
              .filter((category) => category.parentId === section.id)
              .sort((a, b) => a.order - b.order);

            return (
              <Card key={section.id} className="gap-0 py-0">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("section")}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {section.localizedName ?? section.name}
                  </span>
                  {section.localizedName && section.localizedName !== section.name && (
                    <span className="truncate text-xs text-muted-foreground" dir="ltr">
                      {section.name}
                    </span>
                  )}
                  <span className="truncate text-xs text-muted-foreground" dir="ltr">
                    /{section.slug}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("productCount", { count: section._count.products })}
                  </span>
                  {!section.isActive && (
                    <StatusBadge tone="neutral">{tCommon("inactive")}</StatusBadge>
                  )}
                  <div className="flex items-center gap-0.5 ms-auto">
                    {rowControls(section, sectionIndex, sections.length)}
                  </div>
                </div>

                <div className="border-t px-3 py-2.5">
                  {children.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("noSubcategories")}</p>
                  ) : (
                    <ul className="space-y-1 border-s ps-3 ms-1.5">
                      {children.map((child, index) => (
                        <li
                          key={child.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5"
                        >
                          <CornerDownRightIcon
                            aria-hidden
                            className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100"
                          />
                          <span className="min-w-0 truncate text-sm">
                            {child.localizedName ?? child.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground" dir="ltr">
                            /{child.slug}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {t("productCount", { count: child._count.subProducts })}
                          </span>
                          {!child.isActive && (
                            <StatusBadge tone="neutral">{tCommon("inactive")}</StatusBadge>
                          )}
                          <div className="flex items-center gap-0.5 ms-auto">
                            {rowControls(child, index, children.length)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Card className="gap-3 py-4 lg:sticky lg:top-20 lg:order-2">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">{t("addTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">{tCommon("name")}</Label>
            <Input
              id="category-name"
              className="h-8"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-slug">{t("slug")}</Label>
            <Input
              id="category-slug"
              className="h-8"
              dir="ltr"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-parent">{t("parentLabel")}</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="category-parent" className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__top__">{t("topLevel")}</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {t("under", { name: section.name })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("parentHint")}</p>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={isPending || !name || !slug}
            onClick={() =>
              run(async () => {
                await createCategory({
                  name,
                  slug,
                  parentId: parentId === "__top__" ? null : parentId,
                });
                setName("");
                setSlug("");
              }, t("toasts.created"))
            }
          >
            {tCommon("create")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-category-name">{tCommon("name")}</Label>
              <Input
                id="edit-category-name"
                className="h-8"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-category-slug">{t("slug")}</Label>
              <Input
                id="edit-category-slug"
                className="h-8"
                dir="ltr"
                value={editSlug}
                onChange={(event) => setEditSlug(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-category-active"
                checked={editActive}
                onCheckedChange={(value) => setEditActive(Boolean(value))}
              />
              <Label htmlFor="edit-category-active" className="font-normal">
                {t("activeLabel")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={isPending || !editName || !editSlug}
              onClick={() => {
                const target = editing;
                if (!target) return;
                run(async () => {
                  await updateCategory(target.id, {
                    name: editName,
                    slug: editSlug,
                    isActive: editActive,
                  });
                  setEditing(null);
                }, t("toasts.updated"));
              }}
            >
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
