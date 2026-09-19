"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function UnauthorizedPage() {
    const t = useTranslations("Unauthorized");
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#f8f8f8] dark:bg-[#000] text-[#1d1d1f] dark:text-white px-4">
            <div className="text-center max-w-xl">
                <h1 className="text-5xl font-semibold tracking-tight mb-4">
                    {t("title")}
                </h1>
                <p className="text-lg text-[#6e6e73] dark:text-[#a1a1aa] mb-8">
                    {t("description")}
                </p>
                <Link
                    href="/sign-in"
                    className="inline-block px-6 py-3 text-sm font-medium text-white bg-black rounded-full hover:bg-neutral-800 transition duration-200"
                >
                    {t("backToSignIn")}
                </Link>
            </div>
        </main>
    );
}
