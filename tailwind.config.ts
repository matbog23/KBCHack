import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        kbc: {
          blue: "#00A3E0",
          "blue-hover": "#0082B3",
          "blue-soft": "#E5F6FC",
          navy: "#002D62",
          "navy-soft": "#1A4273",
          gray: "#F4F6F8",
          line: "#E2E7ED",
          muted: "#5B6B7F",
        },
        /* KBC Mobile dark theme, sampled from the Figma home screen. */
        app: {
          bg: "#0D0F10",
          card: "#1A1D1F",
          raised: "#202426",
          chip: "#252A2D",
          line: "#303538",
          text: "#E6E7E8",
          subtle: "#B6B7B9",
          muted: "#888B8E",
          blue: "#4AA8E8",
          "blue-card": "#4BADE3",
          wallet: "#58ADD8",
          navy: "#173C67",
          green: "#3C9D86",
          "green-dim": "#183D38",
          yellow: "#F1D239",
          "yellow-dim": "#50451B",
          red: "#D85E63",
        },
        /* Emulator dashboard: quiet greys, one KBC-blue accent. */
        dash: {
          canvas: "#E9EAEC",
          surface: "#F5F5F6",
          card: "#FBFBFB",
          line: "#DEDFE2",
          ink: "#111316",
          muted: "#7C8088",
          faint: "#A9ADB3",
        },
        "kbc-blue": "#00A3E0",
        "kbc-navy": "#002D62",
        "kbc-gray": "#F4F6F8",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        phone: "0 0 0 10px #0B1320, 0 0 0 12px #2A3441, 0 40px 80px -20px rgba(0, 45, 98, 0.45)",
        kate: "0 12px 32px -12px rgba(0, 163, 224, 0.55)",
      },
      keyframes: {
        "kate-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 163, 224, 0.45)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 163, 224, 0)" },
        },
      },
      animation: {
        "kate-pulse": "kate-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
