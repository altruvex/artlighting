import { BRANDS, COMPANY } from "@/lib/company";
import { SHOWROOM_MAP, SHOWROOM_SOCIAL } from "@/lib/showroom";
import { absoluteUrl, assetUrl, ORGANIZATION_ID } from "@/lib/site";
import { JsonLd } from "./json-ld";

/**
 * Who publishes the site, once per page: the company as an Organization
 * and its showroom as the store customers visit. Every value comes from
 * lib/company, so structured data and the visible pages cannot disagree.
 */
export function OrganizationSchema({ locale }: { locale: string }) {
  const ar = locale === "ar";
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": ["Organization", "Store"],
        "@id": ORGANIZATION_ID,
        name: ar ? "آرت لايتنج" : COMPANY.name,
        legalName: COMPANY.legalName,
        url: absoluteUrl(locale),
        logo: assetUrl(ar ? "/logo-ar.png" : "/logo-en.png"),
        image: assetUrl("/balcom-landing/landing4.jpg"),
        foundingDate: String(COMPANY.founded),
        telephone: COMPANY.phones.showroom,
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address.street,
          addressLocality: COMPANY.address.locality,
          addressCountry: COMPANY.address.country,
        },
        hasMap: SHOWROOM_MAP,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
            opens: COMPANY.hours.opens,
            closes: COMPANY.hours.closes,
          },
        ],
        contactPoint: [
          { "@type": "ContactPoint", telephone: COMPANY.phones.showroom, contactType: "sales", availableLanguage: ["ar", "en"] },
          { "@type": "ContactPoint", telephone: COMPANY.phones.salesManager, contactType: "sales", areaServed: "EG" },
        ],
        brand: BRANDS.map((brand) => ({ "@type": "Brand", name: brand.name })),
        paymentAccepted: "Cash",
        currenciesAccepted: "EGP",
        areaServed: "EG",
        sameAs: Object.values(SHOWROOM_SOCIAL),
      }}
    />
  );
}
