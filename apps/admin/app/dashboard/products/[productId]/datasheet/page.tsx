import { requirePermissionOrRedirect } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDatasheetDraft } from "@repo/datasheet-data";
import { notFound } from "next/navigation";
import { DatasheetStudio } from "./datasheet-studio";

export default async function DatasheetStudioPage({ params }: { params: Promise<{ productId: string }> }) {
  const admin = await requirePermissionOrRedirect("datasheet:generate");
  const { productId } = await params;
  const loaded = await getDatasheetDraft(productId);
  if (!loaded) notFound();

  return (
    <DatasheetStudio
      initialDraft={loaded.draft}
      imageOptions={loaded.imageOptions}
      canSaveToProduct={can(admin.role, "product:write")}
    />
  );
}
