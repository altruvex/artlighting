import { requirePermissionOrRedirect } from "@/lib/auth";
import { getQuotationEditorOptions } from "@/lib/quotations/editor-data";
import { DEFAULT_TAX_RATE, DEFAULT_TERMS, DEFAULT_VALIDITY_DAYS } from "@/lib/quotations/schema";
import { toDateInput } from "@/lib/quotations/view";
import { QuotationEditor } from "../quotation-editor";

export default async function NewQuotationPage() {
  await requirePermissionOrRedirect("quotation:write");
  const { customers, products } = await getQuotationEditorOptions();

  return (
    <QuotationEditor
      quotation={null}
      customers={customers}
      products={products}
      canWrite
      defaults={{
        taxRate: DEFAULT_TAX_RATE,
        validityDays: DEFAULT_VALIDITY_DAYS,
        terms: DEFAULT_TERMS,
        today: toDateInput(new Date()),
      }}
    />
  );
}
