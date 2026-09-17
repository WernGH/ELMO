/**
 * ELMO Phase 3 — Design Intelligence Engine (DesignIntelligenceEngine)
 *
 * Systematically determines cohesive visual direction, typography scales,
 * curated HSL/Hex color palettes, container rhythms, and responsive tokens
 * tailored per industry and brand style.
 */

import { WebsiteStyleConfig, BrandStyleDirection } from "../types/agentic.types";

export interface DesignSystemSpecification {
  styles: WebsiteStyleConfig;
  containerWidth: "narrow" | "normal" | "wide" | "full";
  spacingScale: "compact" | "normal" | "relaxed";
  buttonStyle: "pill" | "rounded" | "square" | "glass";
  gradientEffect: string;
  cardStyle: "glass" | "solid" | "bordered" | "minimal";
  shadowScale: "none" | "subtle" | "prominent" | "glow";
}

export class DesignIntelligenceEngine {
  private static instance: DesignIntelligenceEngine;

  private constructor() {}

  public static getInstance(): DesignIntelligenceEngine {
    if (!DesignIntelligenceEngine.instance) {
      DesignIntelligenceEngine.instance = new DesignIntelligenceEngine();
    }
    return DesignIntelligenceEngine.instance;
  }

  /**
   * Generates a complete design system specification.
   */
  public generateDesignSystem(
    brandStyle: BrandStyleDirection = "Modern",
    industry = "General Business",
    themeMode: "dark" | "light" | "auto" = "dark"
  ): DesignSystemSpecification {
    const palette = this.resolvePalette(brandStyle, industry, themeMode);
    const typography = this.resolveTypography(brandStyle, industry);
    const borderRadius = this.resolveBorderRadius(brandStyle);

    const styles: WebsiteStyleConfig = {
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
      textColor: palette.text,
      fontHeading: typography.heading,
      fontBody: typography.body,
      borderRadius,
      themeMode,
    };

    let containerWidth: "narrow" | "normal" | "wide" | "full" = "normal";
    if (brandStyle === "Editorial" || brandStyle === "Luxury") containerWidth = "narrow";
    if (brandStyle === "Technical" || industry === "SaaS") containerWidth = "wide";

    const spacingScale = brandStyle === "Minimal" || brandStyle === "Technical" ? "compact" : brandStyle === "Luxury" ? "relaxed" : "normal";
    const buttonStyle = brandStyle === "Playful" ? "pill" : brandStyle === "Minimal" ? "square" : brandStyle === "Luxury" ? "glass" : "rounded";
    const cardStyle = brandStyle === "Futuristic" ? "glass" : brandStyle === "Minimal" ? "minimal" : "bordered";
    const shadowScale = brandStyle === "Luxury" || brandStyle === "Premium" ? "glow" : brandStyle === "Minimal" ? "none" : "prominent";

    return {
      styles,
      containerWidth,
      spacingScale,
      buttonStyle,
      gradientEffect: palette.gradient,
      cardStyle,
      shadowScale,
    };
  }

  /**
   * Resolves harmonized color palettes based on style and industry.
   */
  private resolvePalette(
    brandStyle: BrandStyleDirection,
    industry: string,
    themeMode: "dark" | "light" | "auto"
  ): { primary: string; secondary: string; accent: string; background: string; text: string; gradient: string } {
    const isDark = themeMode !== "light";

    // 1. Industry-first palettes
    if (industry === "Restaurant" || industry === "Hospitality") {
      return {
        primary: "#f59e0b", // Warm Amber
        secondary: "#ea580c", // Rich Terracotta
        accent: "#eab308", // Golden Accent
        background: isDark ? "#090c15" : "#fafaf9",
        text: isDark ? "#f8fafc" : "#1c1917",
        gradient: "linear-gradient(180deg, #131722 0%, #090c15 100%)",
      };
    }

    if (industry === "Insurance" || industry === "Finance" || industry === "Legal") {
      return {
        primary: "#2563eb", // Deep Royal Blue
        secondary: "#0284c7", // Sky Cerulean
        accent: "#10b981", // Emerald Trust
        background: isDark ? "#020617" : "#f8fafc",
        text: isDark ? "#f8fafc" : "#0f172a",
        gradient: "linear-gradient(180deg, #091328 0%, #020617 100%)",
      };
    }

    if (industry === "SaaS" || industry === "Technology") {
      return {
        primary: "#6366f1", // Electric Indigo
        secondary: "#8b5cf6", // Purple Neon
        accent: "#06b6d4", // Cyan Glow
        background: isDark ? "#030712" : "#ffffff",
        text: isDark ? "#f9fafb" : "#111827",
        gradient: "linear-gradient(180deg, #0c1124 0%, #030712 100%)",
      };
    }

    if (industry === "Healthcare") {
      return {
        primary: "#0d9488", // Ocean Teal
        secondary: "#0284c7", // Serene Blue
        accent: "#10b981", // Restorative Green
        background: isDark ? "#03131c" : "#f0fdfa",
        text: isDark ? "#f0fdf4" : "#134e4a",
        gradient: "linear-gradient(180deg, #082433 0%, #03131c 100%)",
      };
    }

    if (industry === "Fitness") {
      return {
        primary: "#ef4444", // High-Energy Crimson
        secondary: "#f59e0b", // Fire Amber
        accent: "#10b981", // Athletic Neon
        background: isDark ? "#0a0a0a" : "#fef2f2",
        text: isDark ? "#ffffff" : "#18181b",
        gradient: "linear-gradient(180deg, #1c0d0d 0%, #0a0a0a 100%)",
      };
    }

    if (industry === "Coaching" || industry === "Consulting") {
      return {
        primary: "#7c3aed", // Authority Purple
        secondary: "#f59e0b", // Breakthrough Gold
        accent: "#10b981", // Growth Emerald
        background: isDark ? "#030712" : "#f9fafb",
        text: isDark ? "#f8fafc" : "#111827",
        gradient: "linear-gradient(180deg, #120924 0%, #030712 100%)",
      };
    }

    // 2. Style-based fallbacks
    if (brandStyle === "Luxury") {
      return {
        primary: "#d97706", // Champagne Gold
        secondary: "#b45309", // Warm Bronze
        accent: "#e2e8f0", // Platinum Silver
        background: isDark ? "#050505" : "#fafaf9",
        text: isDark ? "#fef3c7" : "#1c1917",
        gradient: "linear-gradient(180deg, #141009 0%, #050505 100%)",
      };
    }

    if (brandStyle === "Minimal") {
      return {
        primary: "#475569", // Slate Neutral
        secondary: "#334155", // Charcoal
        accent: "#64748b", // Subtle Cool
        background: isDark ? "#09090b" : "#ffffff",
        text: isDark ? "#f4f4f5" : "#18181b",
        gradient: "none",
      };
    }

    if (brandStyle === "Futuristic") {
      return {
        primary: "#06b6d4", // Electric Cyan
        secondary: "#ec4899", // Neon Magenta
        accent: "#8b5cf6", // Cyber Violet
        background: isDark ? "#02040a" : "#f8fafc",
        text: isDark ? "#e0f2fe" : "#090d16",
        gradient: "linear-gradient(180deg, #051428 0%, #02040a 100%)",
      };
    }

    // Default Modern / Premium
    return {
      primary: "#f59e0b",
      secondary: "#3b82f6",
      accent: "#10b981",
      background: isDark ? "#020617" : "#f8fafc",
      text: isDark ? "#f8fafc" : "#0f172a",
      gradient: "linear-gradient(180deg, #090d16 0%, #020617 100%)",
    };
  }

  /**
   * Resolves typography pairings.
   */
  private resolveTypography(brandStyle: BrandStyleDirection, industry: string): { heading: string; body: string } {
    if (brandStyle === "Luxury" || brandStyle === "Editorial") {
      return {
        heading: "'Playfair Display', Georgia, serif",
        body: "'Inter', -apple-system, sans-serif",
      };
    }
    if (brandStyle === "Technical" || industry === "Technology") {
      return {
        heading: "'JetBrains Mono', monospace",
        body: "'Inter', -apple-system, sans-serif",
      };
    }
    if (brandStyle === "Playful" || industry === "Fitness") {
      return {
        heading: "'Outfit', 'Plus Jakarta Sans', sans-serif",
        body: "'Inter', sans-serif",
      };
    }
    if (brandStyle === "Corporate" || industry === "Finance" || industry === "Insurance") {
      return {
        heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
        body: "'Inter', sans-serif",
      };
    }

    return {
      heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    };
  }

  private resolveBorderRadius(brandStyle: BrandStyleDirection): "none" | "sm" | "md" | "lg" | "xl" | "full" {
    if (brandStyle === "Minimal") return "sm";
    if (brandStyle === "Corporate") return "md";
    if (brandStyle === "Playful") return "full";
    if (brandStyle === "Luxury") return "sm";
    return "lg";
  }
}
