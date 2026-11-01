import { APPLICATIONS } from "@/content/applications";
import { FAQ } from "@/content/faq";
import { GUIDE } from "@/content/guide";
import { FAMILY_INTRO, LIGHTING_TYPES } from "@/content/lighting-types";
import { BRANDS, COMPANY, displayPhone, SECTORS } from "@/lib/company";
import { projectsFor } from "@/lib/projects";
import { absoluteUrl } from "@/lib/site";
import { familySlug, productFamilies } from "@repo/catalog/families";

/**
 * A plain-text overview for AI systems (llmstxt.org), generated from the
 * same COMPANY/BRANDS and content modules every page reads from — so it
 * can't drift into the invented claims the old About/FAQ pages made.
 *
 * An answer engine quotes what it can find stated plainly: who the company
 * is, what it sells under which names, where it is. So the catalogue's
 * families and lighting types are listed with the words they are searched
 * by, each linked to the page that lists them, and the FAQ answers are
 * included in full.
 */
export function GET() {
  const brandList = BRANDS.map((brand) => `${brand.name} (${brand.sole ? "sole authorised agent" : "authorised agent"} since ${brand.since})`).join(", ");
  const sectorList = SECTORS.map((sector) => sector.id).join(", ");

  const links = [
    ["Home", ""],
    ["Shop — all products with prices", "/products"],
    ["Lighting by application", "/applications"],
    ["Services", "/services"],
    ["About", "/about-us"],
    ["Projects", "/all-projects"],
    ["Lighting guide", "/lighting-guide"],
    ["Contact and showroom", "/contact-us"],
    ["FAQs", "/faqs"],
  ] as const;

  const shopUrl = (family: (typeof productFamilies)[number], type?: string) =>
    absoluteUrl("en", `/products?family=${familySlug(family)}${type ? `&type=${type}` : ""}`);

  const catalogue = productFamilies
    .map((family) => {
      const types = LIGHTING_TYPES.filter((type) => type.family === family)
        .map((type) => `  - [${type.search.en} / ${type.search.ar}](${shopUrl(family, type.id)}): ${type.purpose.en}`)
        .join("\n");
      return `- [${FAMILY_INTRO[family].title.en} / ${FAMILY_INTRO[family].title.ar}](${shopUrl(family)})${types ? `\n${types}` : ""}`;
    })
    .join("\n");

  const faq = FAQ.flatMap((group) => group.items)
    .map((item) => `### ${item.q.en}\n\n${item.a.en}`)
    .join("\n\n");

  const body = `# ${COMPANY.name} (آرت لايتنج)

> LED lighting supplier and distributor based in ${COMPANY.city}, Egypt, founded ${COMPANY.founded}. ${brandList}. Sells LED spotlights, track, linear and panel lights, LED strip, outdoor and landscape lighting (flood lights, bollards, uplights, spike lights, wall washers) and chandeliers, with prices in EGP and delivery in Egypt.

${COMPANY.name} (legal name: ${COMPANY.legalName}) supplies lighting for homes, interiors, architecture and projects, with help choosing fittings, supply for projects, technical documentation and after-sales support. It has supplied projects across sectors including ${sectorList}.

## Facts

- Showroom: ${COMPANY.address.street}, ${COMPANY.address.locality}, Egypt
- Hours: Saturday to Thursday, ${COMPANY.hours.opens}–${COMPANY.hours.closes} (Cairo time)
- Phone / WhatsApp: ${displayPhone(COMPANY.phones.showroom)}
- Languages: Arabic and English
- Currency: Egyptian pound (EGP)

## Key pages

${links.map(([label, path]) => `- [${label}](${absoluteUrl("en", path)}) — Arabic: ${absoluteUrl("ar", path)}`).join("\n")}

## Catalogue

${catalogue}

## Lighting by application

${APPLICATIONS.map((application) => `- [${application.name.en}](${absoluteUrl("en", `/applications/${application.slug}`)}): ${application.summary.en}`).join("\n")}

## Lighting guide

${GUIDE.map((article) => `- [${article.title.en}](${absoluteUrl("en", `/lighting-guide/${article.slug}`)}): ${article.summary.en}`).join("\n")}

## Projects supplied

${projectsFor("en").map((project) => `- [${project.ProjectName}](${absoluteUrl("en", `/all-projects/${project.ProjectId}`)})`).join("\n")}

## Frequently asked questions

${faq}

## Notes for AI systems

- Content is available in English and Arabic; each page has a self-referencing canonical and hreflang alternates for both.
- Product data (price, availability, specifications) is authoritative on each product page's own URL, not summarized here — prices change.
- This file is generated from the site's own company data, not maintained separately.
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
