"use client"

import { Button } from "@repo/ui/components/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
import { Globe } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

interface LanguageSwitcherProps {
    currentLocale: string
}

const languages = [
    {
        code: "ar",
        name: "العربية",
        label: "AR",
        dir: "rtl",
    },
    {
        code: "en",
        name: "English",
        label: "EN",
        dir: "ltr",
    },
]

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    const currentLanguage = languages.find((lang) => lang.code === currentLocale) || languages[0]

    const handleLanguageChange = (newLocale: string) => {
        if (newLocale === currentLocale) return

        startTransition(() => {
            const segments = pathname.split("/").filter(Boolean)
            if (segments[0] === currentLocale) {
                segments.shift()
            }
            const newPath = `/${newLocale}/${segments.join("/")}`
            router.push(newPath)

            document.documentElement.dir = languages.find((lang) => lang.code === newLocale)?.dir || "ltr"
            document.documentElement.lang = newLocale
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 bg-transparent px-3 transition-colors duration-[var(--dur-hover)]"
                    disabled={isPending}
                >
                    <Globe className="size-4" aria-hidden />
                    <span className="font-medium text-sm">{currentLanguage.label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        // The current language is marked, not filled: a gold
                        // block (at half opacity, since it was also disabled)
                        // read as a disabled button rather than "you are here".
                        className="cursor-pointer"
                        aria-current={currentLocale === language.code ? "true" : undefined}
                        disabled={isPending}
                    >
                        <div className="flex w-full items-center justify-between gap-3">
                            <span lang={language.code} className="text-sm font-medium">{language.name}</span>
                            {currentLocale === language.code && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
