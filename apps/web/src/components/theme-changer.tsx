'use client';

import { Button } from '@repo/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

export default function ChangeTheme() {
    const { setTheme } = useTheme();
    const t = useTranslations('footer');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Sun aria-hidden className="size-[1.2rem] rotate-0 scale-100 transition-[rotate,scale] duration-[var(--dur-pop)] ease-[var(--ease-out)] dark:-rotate-90 dark:scale-0" />
                    <Moon aria-hidden className="absolute size-[1.2rem] rotate-90 scale-0 transition-[rotate,scale] duration-[var(--dur-pop)] ease-[var(--ease-out)] dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">{t('themeLabel')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                    {t('themeLight')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                    {t('themeDark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                    {t('themeSystem')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
