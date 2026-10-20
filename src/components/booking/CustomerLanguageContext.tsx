"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CUSTOMER_I18N, type CustomerLanguage } from "@/lib/customer-i18n";
import { Globe, Check, Sparkles } from "lucide-react";

interface CustomerLanguageContextType {
  language: CustomerLanguage;
  setLanguage: (lang: CustomerLanguage) => void;
  toggleLanguage: () => void;
  t: typeof CUSTOMER_I18N;
}

const CustomerLanguageContext = createContext<CustomerLanguageContextType>({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: CUSTOMER_I18N,
});

export function CustomerLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<CustomerLanguage>("en");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("customer_language");
      if (stored === "en" || stored === "zh") {
        setLanguageState(stored);
        setShowLanguageModal(false);
      } else {
        // First time visitor -> Show language selection modal
        setShowLanguageModal(true);
      }
    } catch {
      // localStorage disabled/restricted fallback
    }
  }, []);

  function setLanguage(lang: CustomerLanguage) {
    setLanguageState(lang);
    try {
      localStorage.setItem("customer_language", lang);
    } catch {}
    setShowLanguageModal(false);
  }

  function toggleLanguage() {
    const nextLang = language === "en" ? "zh" : "en";
    setLanguage(nextLang);
  }

  return (
    <CustomerLanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: CUSTOMER_I18N,
      }}
    >
      {children}

      {/* First-time Visitor Language Selection Modal */}
      {mounted && showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
              <Globe className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-foreground tracking-tight">
                Welcome / 欢迎光临
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Please select your preferred language
                <br />
                请选择您的浏览语言
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Chinese Card */}
              <button
                type="button"
                onClick={() => setLanguage("zh")}
                className="group p-4 rounded-2xl border-2 border-border/80 hover:border-primary bg-card hover:bg-primary/5 transition-all text-left flex items-center justify-between cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇨🇳</span>
                  <div>
                    <p className="font-black text-base text-foreground group-hover:text-primary transition-colors">
                      中文 (Chinese)
                    </p>
                    <p className="text-xs text-muted-foreground">以中文浏览预约系统</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-all">
                  <Check className="h-4 w-4" />
                </div>
              </button>

              {/* English Card */}
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className="group p-4 rounded-2xl border-2 border-border/80 hover:border-primary bg-card hover:bg-primary/5 transition-all text-left flex items-center justify-between cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇬🇧</span>
                  <div>
                    <p className="font-black text-base text-foreground group-hover:text-primary transition-colors">
                      English
                    </p>
                    <p className="text-xs text-muted-foreground">Browse and book in English</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-all">
                  <Check className="h-4 w-4" />
                </div>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/80">
              You can change this anytime using the top bar language button.
            </p>
          </div>
        </div>
      )}
    </CustomerLanguageContext.Provider>
  );
}

export function useCustomerLanguage() {
  return useContext(CustomerLanguageContext);
}
