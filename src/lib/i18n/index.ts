import { cookies } from "next/headers";
import { en, ko, type Dictionary, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "welc_locale";
export const DEFAULT_LOCALE: Locale = "ko";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "ko";
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return locale === "en" ? en : ko;
}

export { en, ko };
export type { Dictionary, Locale };
