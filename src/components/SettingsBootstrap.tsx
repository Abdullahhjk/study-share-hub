import { useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import {
    AUTO_CURRENCY_KEY,
    dispatchCurrencyEvent,
    fetchUserCurrency,
} from "@/lib/currency";

interface SettingsState {
    currency: string;
    fontSize: string;
    highContrast: boolean;
    dyslexiaFriendly: boolean;
    colorBlindMode: boolean;
    colorBlindType: string;
    appearence: string;
    showDropdown: boolean;
    autoCurrency: boolean;
}

function writeLocalStorage(settings: SettingsState) {
    localStorage.setItem("currency", settings.currency);
    localStorage.setItem("font-size", settings.fontSize);
    localStorage.setItem("high-contrast", String(settings.highContrast));
    localStorage.setItem(
        "dyslexia-friendly",
        String(settings.dyslexiaFriendly)
    );
    localStorage.setItem(
        "colorblind-mode",
        String(settings.colorBlindMode)
    );
    localStorage.setItem(
        "colorblind-type",
        settings.colorBlindType || ""
    );
    localStorage.setItem("theme", settings.appearence);
    localStorage.setItem(
        "show-dropdown",
        String(settings.showDropdown)
    );
    localStorage.setItem(
        AUTO_CURRENCY_KEY,
        String(settings.autoCurrency)
    );
}

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applySettingsToDOM(
    settings: SettingsState,
    setTheme: (theme: string) => void
) {
    const root = document.documentElement;

    const sizes: Record<string, string> = {
        small: "90%",
        normal: "100%",
        large: "115%",
        xlarge: "130%",
    };

    root.style.fontSize =
        sizes[settings.fontSize] ?? "100%";

    root.classList.toggle(
        "high-contrast",
        settings.highContrast
    );

    root.classList.toggle(
        "dyslexia-friendly",
        settings.dyslexiaFriendly
    );

    root.classList.toggle(
        "colorblind-mode",
        settings.colorBlindMode
    );

    Array.from(root.classList).forEach((cls) => {
        if (cls.startsWith("colorblind-")) {
            root.classList.remove(cls);
        }
    });

    if (
        settings.colorBlindMode &&
        settings.colorBlindType
    ) {
        root.classList.add(
            `colorblind-${settings.colorBlindType}`
        );
    }

    if (settings.appearence === "system") {
        setTheme(getSystemTheme());
    } else if (settings.appearence) {
        setTheme(settings.appearence);
    }

    const existingFont =
        document.querySelector("#dyslexia-font");

    if (settings.dyslexiaFriendly) {
        if (!existingFont) {
            const link = document.createElement("link");

            link.id = "dyslexia-font";
            link.rel = "stylesheet";
            link.href =
                "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap";

            document.head.appendChild(link);
        }
    } else {
        existingFont?.remove();
    }
}

/**
 * Prevents duplicate execution caused by:
 * - Route changes
 * - Component remounts
 * - React StrictMode double effects
 */
let bootstrapStarted = false;

export default function SettingsBootstrap() {
    const { setTheme } = useTheme();

    useEffect(() => {
        if (bootstrapStarted) return;

        bootstrapStarted = true;

        const media = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        const handleSystemThemeChange = () => {
            const savedTheme =
                localStorage.getItem("theme");

            if (savedTheme === "system") {
                setTheme(
                    media.matches ? "dark" : "light"
                );
            }
        };

        const loadSettings = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) return;

                const { data, error } = await supabase
                    .from("user_settings")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error || !data) {
                    console.error(
                        "Failed to load settings:",
                        error
                    );
                    return;
                }

                const settings: SettingsState = {
                    currency: data.currency,
                    fontSize: data.font_size,
                    highContrast: data.high_contrast,
                    dyslexiaFriendly:
                        data.dyslexia_friendly,
                    colorBlindMode:
                        data.colorblind_mode,
                    colorBlindType:
                        data.colorblind_type,
                    appearence: data.appearence,
                    showDropdown:
                        data.show_dropdown ?? false,
                    autoCurrency:
                        data.autoselect_currency ?? false,
                };

                writeLocalStorage(settings);

                applySettingsToDOM(
                    settings,
                    setTheme
                );

                dispatchCurrencyEvent();

                if (settings.autoCurrency) {
                    const detected =
                        await fetchUserCurrency();

                    if (detected) {
                        localStorage.setItem(
                            "currency",
                            detected
                        );

                        dispatchCurrencyEvent();
                    }
                }

                // Settings bootstrap completed
            } catch (err) {
                console.error(
                    "Settings bootstrap failed:",
                    err
                );
            }
        };

        media.addEventListener(
            "change",
            handleSystemThemeChange
        );

        loadSettings();

        return () => {
            media.removeEventListener(
                "change",
                handleSystemThemeChange
            );
        };
    }, [setTheme]);

    return null;
}