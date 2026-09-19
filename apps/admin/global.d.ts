import type en from "./messages/en/index";
import type { Locale } from "./i18n/config";

// Type-safe message keys and locales for next-intl: a key missing from
// messages/en.json is a compile error. messages/ar.json must mirror en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
