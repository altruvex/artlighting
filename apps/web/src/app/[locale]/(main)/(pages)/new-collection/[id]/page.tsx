import { getLocaleFromParams } from "@/lib/i18n/utils";
import { permanentRedirect } from "next/navigation";
import { COLLECTION_HREF } from "../collection-links";

/**
 * A collection's detail page read a `collectionId` param that this route
 * never had, so every one of them said "Collection not found". The line is
 * its products, so it points at them in the shop.
 */
export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const awaited = await params;
  const locale = getLocaleFromParams(awaited);
  permanentRedirect(`/${locale}${COLLECTION_HREF[awaited.id] ?? "/new-collection"}`);
}
