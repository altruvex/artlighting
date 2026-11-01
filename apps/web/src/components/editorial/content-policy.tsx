import { pick } from "@/content/l10n";
import type { PolicyContent } from "@/content/policies";
import type { POLICIES } from "@/lib/company";
import { PolicyDocument } from "./policy-document";

/** A policy whose text lives in content/policies, rendered as a document. */
export function ContentPolicy({ locale, id, content }: { locale: string; id: (typeof POLICIES)[number]["id"]; content: PolicyContent }) {
  const sections = content.sections.map((section) => ({
    id: section.id,
    title: pick(section.title, locale),
    body: (
      <>
        {section.blocks.map((block, index) =>
          block.kind === "ul" ? (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item.en}>{pick(item, locale)}</li>
              ))}
            </ul>
          ) : (
            <p key={index} className={block.kind === "callout" ? "callout" : undefined}>
              {pick(block.text, locale)}
            </p>
          ),
        )}
      </>
    ),
  }));

  return <PolicyDocument locale={locale} id={id} title={pick(content.title, locale)} lede={pick(content.lede, locale)} sections={sections} />;
}
