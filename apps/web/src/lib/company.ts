/**
 * What Art Lighting is, stated once, from the company's own record.
 *
 * Every claim a page makes about the company reads from here, and every
 * entry here comes from somewhere a person can check: the company profile
 * (public/portfolio/portfolio-artlighting.pdf), the approval letters and
 * certificates in public/approvals, the installed projects in src/data, or
 * the checkout code. The pages this replaced said Art Lighting was "a team
 * of passionate innovators" set on "revolutionizing the tech industry", an
 * Energy Star partner, and a maker of custom fixtures — none of it written
 * anywhere the company wrote it.
 *
 * If a capability is not listed as available here, no page offers it.
 */

export const COMPANY = {
  legalName: "Art Lighting for Electrical Supplies",
  name: "Art Lighting",
  founded: 2010,
  city: "Cairo",
  country: "EG",
  address: {
    street: "49 El Shaheed Sayed Zakaria St, Saqr Quraish Buildings, Sheraton Al Matar",
    locality: "El Nozha, Cairo",
    country: "EG",
  },
  phones: {
    /** The showroom line, also on WhatsApp. */
    showroom: "+201154466259",
    salesManager: "+201102131731",
    landline: "+20222693008",
  },
  /** Saturday to Thursday, 09:30–17:30 (Africa/Cairo). */
  hours: { days: ["Sa", "Su", "Mo", "Tu", "We", "Th"], opens: "09:30", closes: "17:30" },
} as const;

/** The company's milestones, as the profile lists them. Nothing is added between them. */
export const MILESTONES = [2010, 2019, 2023] as const;

/** The brands Art Lighting is the authorised agent for, and since when. */
export const BRANDS = [
  { id: "balcom", name: "Balcom", since: 2010, sole: true, logo: { light: "/brand/balcom-black.png", dark: "/brand/balcom-white.png" } },
  { id: "mister-led", name: "Mister LED", since: 2023, sole: false, logo: { light: "/brand/mrled-black.png", dark: "/brand/mrled-white.png" } },
] as const;

/**
 * Sectors the company has supplied, from the projects in its profile. The
 * named examples are the ones the profile names; `ids` are the ones this
 * site has a project page for.
 */
export const SECTORS = [
  { id: "healthcare", ids: ["mansoura-hospital", "esna-hospital", "armant-hospital", "maadi-hospital"] },
  { id: "hospitality", ids: ["tolip", "al-galala-resort"] },
  { id: "residential", ids: ["dar-misr", "new-ismalia-compound", "wesal-compound", "alkaraz"] },
  { id: "education", ids: ["auc-university", "al-galala-university", "al-mynia-university"] },
  { id: "civic", ids: ["al-majd"] },
  { id: "landscape", ids: ["almaza-park"] },
] as const;
export type SectorId = (typeof SECTORS)[number]["id"];

/**
 * How Art Lighting works with a customer.
 *
 * `available` is the switch. Everything true is something the company does
 * today — advice from the showroom, supply for projects, the documents a
 * consultant asks for, after-sales service (all in the company profile or
 * already offered on this site). What is false is a place kept for work the
 * company may offer later — a lighting study with calculations, say — and
 * no page renders it until someone who can promise it turns it on.
 */
export const SERVICES = [
  { id: "selection", available: true },
  { id: "projects", available: true },
  { id: "documentation", available: true },
  { id: "aftersales", available: true },
  { id: "studies", available: false },
] as const;
export type ServiceId = (typeof SERVICES)[number]["id"];
export const availableServices = () => SERVICES.filter((service) => service.available).map((service) => service.id);

/** The documents in the repository that back the trust section. */
export const DOCUMENTS = {
  portfolio: "/portfolio/portfolio-artlighting.pdf",
  approvals: [
    { src: "/approvals/approval-1.jpg", width: 3000, height: 1518 },
    { src: "/approvals/approval-5.png", width: 1653, height: 2339 },
  ],
  certificates: [
    { src: "/approvals/approval-2.jpg", width: 3000, height: 1601 },
    { src: "/approvals/approval-3.jpg", width: 3000, height: 1581 },
    { src: "/approvals/approval-4.jpg", width: 3000, height: 1575 },
  ],
} as const;

/**
 * The store policies. A policy is linked from the footer and the other
 * policies, and listed in the sitemap, by being here. The text of returns,
 * warranty and terms is in content/policies (see the note there on what a
 * manager should confirm).
 */
export const POLICIES = [
  { id: "terms", href: "/terms" },
  { id: "shipping", href: "/shipping" },
  { id: "returns", href: "/returns" },
  { id: "warranty", href: "/warranty" },
  { id: "privacy", href: "/privacy" },
] as const;

/** Formats +201154466259 as +20 115 446 6259 for display. */
export function displayPhone(e164: string) {
  const digits = e164.replace(/^\+20/, "");
  if (digits.length === 10) return `+20 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9) return `+20 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  return e164;
}
