import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#030712",
        surface: {
          50: "#1E293B",
          100: "#141F32",
          200: "#0E1726",
          300: "#09101C",
          card: "#070D18",
          cardHover: "#0C1628",
          border: "#132238",
          borderHighlight: "#1E3658",
        },
        elmo: {
          // BLUE NEON FOUNDATION PALETTE (PHASE 3 VISUAL DIRECTION)
          matteBlack: "#03060C",
          deepBlack: "#050914",
          charcoal: "#0A1120",
          graphite: "#0E172B",
          gunmetal: "#14223B",
          panel: "#08101F",
          border: "#162845",
          borderHighlight: "#1F3B66",

          // PRIMARY ACCENTS: BLUE NEON SPECTRUM
          electric: "#0084FF",
          electricBlue: "#0084FF",
          neonBlue: "#00D2FF",
          brightCyan: "#00F0FF",
          cyan: "#00E5FF",
          cyanHighlight: "#70F2FF",
          whiteBlue: "#E6F6FF",
          blueDark: "#041A38",
          blueGlow: "rgba(0, 210, 255, 0.35)",

          // COMPATIBILITY ALIASES (Maps legacy green tokens to Electric Neon Blue for seamless test/code stability)
          neonGreen: "#00E5FF",
          green: "#00D2FF",
          greenDim: "#0099DD",
          greenDark: "#041A38",
          greenGlow: "rgba(0, 210, 255, 0.25)",

          // STATUS & TELEMETRY (Minimal alert/warning)
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
          red: "#E11D48",
          purple: "#7C3AED",
          text: "#F1F5F9",
          textMuted: "#94A3B8",
          textDim: "#64748B",
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(0, 210, 255, 0.35)",
        glowBlue: "0 0 30px -5px rgba(0, 210, 255, 0.45)",
        glowBlueSm: "0 0 14px rgba(0, 210, 255, 0.35)",
        glowElectric: "0 0 30px -5px rgba(0, 132, 255, 0.5)",
        glowElectricSm: "0 0 14px rgba(0, 132, 255, 0.35)",
        glowCyan: "0 0 25px -5px rgba(0, 229, 255, 0.4)",
        glowCyanSm: "0 0 12px rgba(0, 229, 255, 0.3)",
        glowGreen: "0 0 25px -5px rgba(0, 229, 255, 0.35)",
        glowGreenSm: "0 0 12px rgba(0, 229, 255, 0.25)",
        glowRed: "0 0 25px -5px rgba(225, 29, 72, 0.35)",
        glowRedSm: "0 0 12px rgba(225, 29, 72, 0.25)",
        glowGold: "0 0 25px -5px rgba(245, 158, 11, 0.35)",
        glowGoldSm: "0 0 12px rgba(245, 158, 11, 0.25)",
        commandCard: "0 4px 20px -2px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(22, 40, 69, 0.9)",
        neonCard: "0 8px 32px 0 rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(0, 210, 255, 0.12)",
        metallicCard: "0 8px 32px 0 rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(0, 210, 255, 0.12)",
      },
      animation: {
        "radar-pulse": "radar 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "idle-float": "idleFloat 4s ease-in-out infinite",
        "pixel-scan": "pixelScan 3s linear infinite",
        "neon-glow": "neonGlow 3s ease-in-out infinite alternate",
      },
      keyframes: {
        radar: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        idleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        pixelScan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
        neonGlow: {
          "0%": { filter: "drop-shadow(0 0 8px rgba(0, 210, 255, 0.3))" },
          "100%": { filter: "drop-shadow(0 0 18px rgba(0, 210, 255, 0.7))" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
