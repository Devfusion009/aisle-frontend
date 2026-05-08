'use client';

import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Globe } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './dropdown-menu';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                    <Globe className="h-4 w-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" />
                    <span className="sr-only">Toggle language</span>
                    <span className="absolute bottom-0 right-0 text-[9px] font-bold text-slate-400 bg-background rounded-full px-0.5 shadow-sm border border-slate-200 dark:border-slate-800">
                        {i18n.language === 'en' ? 'EN' : 'PT'}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => changeLanguage('pt')}
                    className={i18n.language === 'pt' ? 'bg-slate-100 dark:bg-slate-800 font-medium' : ''}
                >
                    Português (Brasil)
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage('en')}
                    className={i18n.language === 'en' ? 'bg-slate-100 dark:bg-slate-800 font-medium' : ''}
                >
                    English
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
