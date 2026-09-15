"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Globe, ChevronDown, Check, Search, X } from "lucide-react";
import { LanguageContextService } from "@/services/voice/language-context.service";
import { VoiceController } from "@/services/voice/voice-controller";
import { LanguageCapability } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

interface VoiceLanguageSelectorProps {
  controller?: VoiceController | null;
  currentLanguage?: string;
  onLanguageChange?: (languageCode: string, bcp47Tag: string) => void;
  className?: string;
  size?: "sm" | "md";
}

// Prominent quick-select languages for top executive regions
const POPULAR_LANGUAGES: { code: string; flag: string; label: string; native: string; bcp47: string }[] = [
  { code: "ms", flag: "🇲🇾", label: "Malay", native: "Bahasa Melayu", bcp47: "ms-MY" },
  { code: "en", flag: "🇺🇸", label: "English", native: "English (US)", bcp47: "en-US" },
  { code: "zh", flag: "🇨🇳", label: "Mandarin", native: "中文 (普通话)", bcp47: "zh-CN" },
  { code: "yue", flag: "🇭🇰", label: "Cantonese", native: "粵語", bcp47: "zh-HK" },
  { code: "id", flag: "🇮🇩", label: "Indonesian", native: "Bahasa Indonesia", bcp47: "id-ID" },
  { code: "es", flag: "🇪🇸", label: "Spanish", native: "Español", bcp47: "es-ES" },
  { code: "ja", flag: "🇯🇵", label: "Japanese", native: "日本語", bcp47: "ja-JP" },
  { code: "ar", flag: "🇸🇦", label: "Arabic", native: "العربية", bcp47: "ar-SA" },
  { code: "fr", flag: "🇫🇷", label: "French", native: "Français", bcp47: "fr-FR" },
  { code: "de", flag: "🇩🇪", label: "German", native: "Deutsch", bcp47: "de-DE" },
  { code: "ko", flag: "🇰🇷", label: "Korean", native: "한국어", bcp47: "ko-KR" },
  { code: "hi", flag: "🇮🇳", label: "Hindi", native: "हिन्दी", bcp47: "hi-IN" },
  { code: "th", flag: "🇹🇭", label: "Thai", native: "ไทย", bcp47: "th-TH" },
  { code: "vi", flag: "🇻🇳", label: "Vietnamese", native: "Tiếng Việt", bcp47: "vi-VN" },
];

export function VoiceLanguageSelector({
  controller,
  currentLanguage,
  onLanguageChange,
  className,
  size = "md",
}: VoiceLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    if (currentLanguage) return currentLanguage;
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("elmo_voice_language");
      if (saved) {
        return LanguageContextService.resolveLanguageStringToCode(saved) || "en";
      }
    }
    return "en";
  });
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const langService = useMemo(() => LanguageContextService.getInstance(), []);

  // Sync with prop when changed externally (e.g. turn-by-turn detection)
  useEffect(() => {
    if (currentLanguage && currentLanguage !== selectedLang) {
      setSelectedLang(currentLanguage);
    }
  }, [currentLanguage, selectedLang]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const allCapabilities = useMemo(() => {
    return langService.getAllCapabilities();
  }, [langService]);

  const filteredCapabilities = useMemo(() => {
    if (!searchQuery.trim()) return allCapabilities;
    const q = searchQuery.toLowerCase().trim();
    return allCapabilities.filter((c) => {
      return (
        c.languageName.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q) ||
        c.languageCode.toLowerCase().includes(q) ||
        c.bcp47Tag.toLowerCase().includes(q)
      );
    });
  }, [allCapabilities, searchQuery]);

  const handleSelectLanguage = (code: string, bcp47: string) => {
    setSelectedLang(code);
    setIsOpen(false);

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("elmo_voice_language", bcp47);
      } catch {}
    }

    if (controller) {
      controller.setLanguage(code);
    }

    if (onLanguageChange) {
      onLanguageChange(code, bcp47);
    }

    const label = LanguageContextService.getLanguageLabel(code);
    setSwitchFeedback(`Voice listening in ${label}`);
    setTimeout(() => {
      setSwitchFeedback(null);
    }, 2800);
  };

  const currentCap = allCapabilities.find((c) => c.languageCode === selectedLang) || {
    languageCode: selectedLang,
    languageName: LanguageContextService.getLanguageLabel(selectedLang),
    nativeName: LanguageContextService.getLanguageLabel(selectedLang),
    bcp47Tag: LanguageContextService.getBcp47Tag(selectedLang),
  };

  return (
    <div className={cn("relative inline-block font-sans", className)} ref={containerRef}>
      {/* Dynamic Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-full border transition-all duration-200 group select-none shadow-sm",
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
          isOpen
            ? "bg-[#0B1E38] border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
            : "bg-[#071120] border-cyan-500/30 text-zinc-200 hover:border-cyan-400/70 hover:text-white"
        )}
        title="Change spoken voice language (Click to switch)"
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
        <span className="font-mono text-[10px] uppercase text-zinc-400 font-semibold">
          VOICE:
        </span>
        <span className="font-bold tracking-wide text-cyan-300">
          {currentCap.languageName}
        </span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
          {currentCap.bcp47Tag}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-cyan-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Floating Temporary Switch Feedback Banner */}
      {switchFeedback && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-cyan-950 border border-cyan-400 text-cyan-200 text-[11px] font-mono rounded-md shadow-[0_0_20px_rgba(0,210,255,0.4)] whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
          ✓ {switchFeedback}
        </div>
      )}

      {/* Futuristic Language Selection Dropdown Modal */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-w-[90vw] rounded-2xl bg-[#040914]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(0,210,255,0.2)] p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Select Voice Input Language"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#142642]">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  Select Spoken Voice Language
                </h4>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                ELMO will listen and respond naturally in this language.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick-Pick Region Chips */}
          <div className="my-3 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
              Quick Select:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LANGUAGES.map((item) => {
                const isCurrent = selectedLang === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectLanguage(item.code, item.bcp47)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,210,255,0.3)]"
                        : "bg-[#081224] border-[#162744] text-zinc-300 hover:border-cyan-500/50 hover:text-white"
                    )}
                  >
                    <span>{item.flag}</span>
                    <span>{item.native}</span>
                    {isCurrent && <Check className="w-3 h-3 text-cyan-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative my-2.5">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 35+ world languages (e.g. Malay, Chinese, Spanish)..."
              className="w-full bg-[#071120] border border-[#162744] focus:border-cyan-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
            />
          </div>

          {/* All Languages Scrollable List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredCapabilities.map((item: LanguageCapability) => {
              const isCurrent = selectedLang === item.languageCode;
              return (
                <button
                  key={item.languageCode}
                  type="button"
                  onClick={() => handleSelectLanguage(item.languageCode, item.bcp47Tag)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors text-xs group",
                    isCurrent
                      ? "bg-cyan-950/60 border border-cyan-400/50 text-white"
                      : "hover:bg-[#071428] text-zinc-300 hover:text-white border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{item.languageName}</span>
                        <span className="text-[11px] text-zinc-400 font-normal">
                          ({item.nativeName})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Tag: {item.bcp47Tag} • Quality: {item.qualityLevel}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                      <Check className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
            {filteredCapabilities.length === 0 && (
              <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                No matching languages found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
