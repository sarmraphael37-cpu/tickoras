import type { Config } from "tailwindcss";

/**
 * TICKORA design tokens — Midnight Navy & Electric Blue (dark) with a
 * complementary light theme. Colour values resolve through CSS custom
 * properties defined in globals.css so [data-theme="light"] can override
 * every surface, text and border token at runtime.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* Application surfaces */
        base: "rgb(var(--tickora-base) / <alpha-value>)",
        deep: "rgb(var(--tickora-deep) / <alpha-value>)",
        card: "rgb(var(--tickora-card) / <alpha-value>)",
        surface: "rgb(var(--tickora-surface) / <alpha-value>)",

        /* Legacy surface aliases — paper/cream/sand follow the theme,
           forest stays a fixed dark-navy accent used on hero panels and
           image overlays in both themes. */
        paper: "rgb(var(--tickora-base) / <alpha-value>)",
        cream: "rgb(var(--tickora-deep) / <alpha-value>)",
        forest: "#0D1B30",
        sand: "rgb(var(--tickora-surface) / <alpha-value>)",

        /* Interactive blue scale — brand hues are theme-independent */
        brand: {
          50: "rgb(var(--tickora-brand-50) / <alpha-value>)",
          100: "#173657",
          200: "#1E4A82",
          300: "#2563EB",
          400: "#3B82F6",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "rgb(var(--tickora-brand-950) / <alpha-value>)",
        },

        /* Readable blue text scale */
        accent: {
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#60A5FA",
          400: "#3B82F6",
          500: "#2563EB",
        },
        ice: "rgb(var(--tickora-ice) / <alpha-value>)",
        soft: "rgb(var(--tickora-soft) / <alpha-value>)",

        /* Typography */
        ink: "rgb(var(--tickora-ink) / <alpha-value>)",
        muted: "rgb(var(--tickora-muted) / <alpha-value>)",
        faint: "rgb(var(--tickora-faint) / <alpha-value>)",
        line: "rgb(var(--tickora-line) / <alpha-value>)",

        /* Semantic */
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#38BDF8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.18), 0 16px 40px -24px rgba(0,0,0,0.65)",
        float: "0 28px 64px -28px rgba(0,0,0,0.8)",
        ring: "0 0 0 1px rgba(148,163,184,0.08)",
        glow: "0 12px 34px -14px rgba(37,99,235,0.55)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(59,130,246,0.4)" },
          "70%": { boxShadow: "0 0 0 12px rgba(59,130,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0)" },
        },
        "dropdown-in": {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.8s infinite",
        "pulse-ring": "pulse-ring 2s infinite",
        "dropdown-in": "dropdown-in 0.16s ease-out both",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse at 78% 12%, rgba(37,99,235,0.22), transparent 52%), radial-gradient(ellipse at 12% 88%, rgba(96,165,250,0.08), transparent 48%)",
      },
    },
  },
  plugins: [],
};

export default config;
