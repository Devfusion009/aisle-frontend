'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

interface I18nProviderProps {
    children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
    useEffect(() => {
        // Portuguese is the default for everyone; only honor a user's explicit
        // previous choice from the language switcher.
        const storedLng = localStorage.getItem('i18nextLng');
        if (storedLng === 'en' || storedLng === 'pt') {
            i18n.changeLanguage(storedLng);
        } else {
            i18n.changeLanguage('pt');
            localStorage.setItem('i18nextLng', 'pt');
        }
    }, []);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
