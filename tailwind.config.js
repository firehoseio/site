/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every template that can emit markup so unused utilities are purged.
  content: [
    "./layouts/**/*.erb",
    "./pages/**/*.{md,html,erb}",
    "./helpers/**/*.rb",
  ],
  theme: {
    extend: {
      colors: {
        // Firehose signature red-orange, extended into a full scale.
        brand: {
          50: "#fff4f0",
          100: "#ffe5dc",
          200: "#ffc8b8",
          300: "#ffa084",
          400: "#fb6a48",
          500: "#f2411c", // the original brand colour
          600: "#dd2f0d",
          700: "#b7220b",
          800: "#921d10",
          900: "#791c12",
          950: "#420b05",
        },
        // Warm near-black that complements the orange better than a cool grey.
        ink: {
          DEFAULT: "#171310",
          soft: "#262019",
          mute: "#6b6259",
        },
      },
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      maxWidth: {
        prose: "68ch",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,19,16,.04), 0 12px 32px -12px rgba(23,19,16,.18)",
      },
      typography: ({ theme }) => ({
        firehose: {
          css: {
            "--tw-prose-body": theme("colors.ink.soft"),
            "--tw-prose-headings": theme("colors.ink.DEFAULT"),
            "--tw-prose-links": theme("colors.brand.600"),
            "--tw-prose-bold": theme("colors.ink.DEFAULT"),
            "--tw-prose-counters": theme("colors.ink.mute"),
            "--tw-prose-bullets": theme("colors.brand.300"),
            "--tw-prose-hr": theme("colors.stone.200"),
            "--tw-prose-quotes": theme("colors.ink.soft"),
            "--tw-prose-quote-borders": theme("colors.brand.300"),
            "--tw-prose-code": theme("colors.ink.DEFAULT"),
            "--tw-prose-pre-bg": "#1c1712",
            "--tw-prose-pre-code": "#f5efe8",
            maxWidth: "68ch",
            fontSize: "1.0625rem",
            lineHeight: "1.75",
            // Section headings get a subtle brand tick and generous space above.
            h1: {
              fontSize: "1.6rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              marginTop: "2.75em",
              marginBottom: "0.8em",
              paddingBottom: "0.35em",
              borderBottom: `1px solid ${theme("colors.stone.200")}`,
            },
            "h1:first-of-type": { marginTop: "0" },
            h2: {
              fontWeight: "700",
              letterSpacing: "-0.01em",
              marginTop: "2.25em",
            },
            // The opening paragraph reads as a lead/dek.
            "> p:first-of-type": {
              fontSize: "1.3rem",
              lineHeight: "1.55",
              color: theme("colors.ink.soft"),
            },
            a: {
              fontWeight: "500",
              textDecoration: "none",
              borderBottom: `1px solid ${theme("colors.brand.200")}`,
              transition: "border-color .15s ease, color .15s ease",
            },
            "a:hover": {
              color: theme("colors.brand.700"),
              borderBottomColor: theme("colors.brand.500"),
            },
            // Inline code as a soft pill; block code handled below.
            code: {
              fontWeight: "500",
              fontSize: "0.9em",
              background: theme("colors.stone.100"),
              padding: "0.15em 0.4em",
              borderRadius: "0.375rem",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              borderRadius: "0.75rem",
              padding: "1.15rem 1.25rem",
              border: "1px solid rgba(23,19,16,.08)",
              boxShadow: "0 12px 32px -18px rgba(23,19,16,.55)",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            },
            "pre code": {
              background: "transparent",
              padding: "0",
              fontWeight: "400",
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
