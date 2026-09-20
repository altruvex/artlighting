import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SpecificationsTable } from "@/types/products"
import { cn } from "@/lib/utils"

interface ProductSpecificationsTableProps {
  specificationsTable: SpecificationsTable
  /**
   * The structured specs. When a product has them, they are used instead of
   * the flat map: the figures come from stored numbers rather than from a
   * string typed once per language, and they arrive grouped. The flat map
   * stays as the fallback for products the spec backfill has not reached.
   */
  specGroups?: { name: string; items: { label: string; value: string }[] }[]
  Brand?: string
  chandelierLightingType?: string | undefined
  hNumber?: number | null
  sectionType?: string
  locale: string
}

export default function ProductSpecificationsTable({
  specificationsTable,
  specGroups,
  Brand,
  chandelierLightingType,
  hNumber,
  sectionType,
  locale,
}: ProductSpecificationsTableProps) {

  const labels = {
    ar: {
      title: "المواصفات التقنية",
      specification: "المواصفة",
      value: "القيمة",
      numberOfArms: "عدد الأذرع",
      hours: "ساعات"
    },
    en: {
      title: "Technical Specifications",
      specification: "Specification",
      value: "Value",
      numberOfArms: "Number of Arms",
      hours: "Hours"
    }
  };

  const currentLabels = labels[locale as keyof typeof labels] || labels.en;

  const calculateWattage = (): string => {
    if (Brand === "mister-led" && chandelierLightingType === "lamp" && hNumber) {
      const wattageText = locale === 'ar' ? "W (لمبة 12W)" : "W (12W lamp)";
      return `${hNumber * 12}${wattageText}`;
    }
    return specificationsTable[locale === 'ar' ? "أقصى قوة" : "Maximum wattage"] || "15W/M";
  };

  const formatValue = (key: string, value: string): string => {
    if (key.includes("Maximum wattage") || key.includes("أقصى قوة")) {
      if (sectionType === "chandelier") {
        const wattageText = locale === 'ar' ? "W (لمبة 12W)" : "W (12W lamp)";
        return hNumber ? `${hNumber * 12}${wattageText}` : "15W/M";
      } else {
        return calculateWattage();
      }
    } else if (key.toLowerCase().includes("hnumber") && hNumber) {
      return hNumber.toString();
    }
    return value;
  };

  const filteredSpecs = Object.entries(specificationsTable).filter(([, value]) =>
    value && String(value).trim() !== ""
  );

  if (specGroups && specGroups.length > 0) {
    return (
      <div className="space-y-6" dir={locale === "ar" ? "rtl" : "ltr"}>
        <h2 className="text-xl md:text-2xl font-semibold">{currentLabels.title}</h2>
        {specGroups.map((group) => (
          <div key={group.name} className="space-y-2">
            <h3 className="text-base font-semibold text-muted-foreground">{group.name}</h3>
            <div className="overflow-x-auto">
              <Table className="w-full border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-foreground text-base text-start">
                      {currentLabels.specification}
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-base text-start">
                      {currentLabels.value}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell className="font-medium text-base text-start">{item.label}</TableCell>
                      {/* dir="ltr" on the value: a figure like "1,320 lm
                          (3,000 K)" is a number followed by a Latin symbol,
                          and bidi reordering would move the unit. */}
                      <TableCell className="text-base text-start" dir="ltr">
                        {item.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-xl md:text-2xl font-semibold">{currentLabels.title}</h2>
      <div className="overflow-x-auto">
        <Table className="w-full border" dir={locale === "ar" ? "rtl" : "ltr"}>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(
                "font-semibold text-foreground border-r text-base",
                locale === 'ar' && "text-right"
              )}>
                {currentLabels.specification}
              </TableHead>
              <TableHead className={cn(
                "font-semibold text-foreground border-r text-base",
                locale === 'ar' && "text-right"
              )}>
                {currentLabels.value}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSpecs.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className={cn(
                  "font-medium border-r text-base",
                  locale === 'ar' && "text-right"
                )}>
                  {key}
                </TableCell>
                <TableCell className={cn(
                  "text-base",
                  locale === 'ar' && "text-right"
                )}>
                  {formatValue(key, String(value || ''))}
                </TableCell>
              </TableRow>
            ))}

            {chandelierLightingType === "lamp" &&
              !specificationsTable["hNumber"] &&
              !specificationsTable["عدد الأذرع"] &&
              hNumber && (
                <TableRow>
                  <TableCell className={cn(
                    "font-medium border-r",
                    locale === 'ar' && "text-right"
                  )}>
                    {currentLabels.numberOfArms}
                  </TableCell>
                  <TableCell className={cn(
                    locale === 'ar' && "text-right"
                  )}>
                    {hNumber}
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}