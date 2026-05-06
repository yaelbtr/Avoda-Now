import { useUserMode } from "@/contexts/UserModeContext";

const SEO_HOUSE_LINKS = [
  { label: "מנקה לבית", href: "/מנקה-לבית" },
  { label: "עוזרת בית", href: "/עוזרת-בית" },
  { label: "דרושה מנקה מהיום", href: "/דרושה-מנקה-מהיום" },
  { label: "כמה עולה עוזרת בית?", href: "/כמה-עולה-עוזרת-בית" },
  { label: "מנקה לבית חד פעמי", href: "/מנקה-לבית-חד-פעמי" },
] as const;

export default function HomeWorkerBelowFold() {
  const { resetUserMode } = useUserMode();

  return (
    <>
      <section
        dir="rtl"
        className="relative z-10"
        style={{
          background: "var(--editorial-surface-container)",
          padding: "22px 16px 28px",
          fontFamily: "var(--font-editorial-ui)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <p
            className="text-[13px] font-black mb-4"
            style={{ color: "var(--editorial-primary)", fontFamily: "var(--font-editorial-headline)", letterSpacing: 0 }}
          >
            שירותי בית וניקיון
          </p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {SEO_HOUSE_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center justify-center text-[13px] font-semibold transition-all flex-shrink-0"
                style={{
                  background: "var(--editorial-surface-container-lowest)",
                  color: "var(--editorial-primary)",
                  border: "1px solid var(--editorial-outline-ghost)",
                  borderRadius: 9999,
                  height: 34,
                  padding: "0 14px",
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        dir="rtl"
        className="relative z-10 px-6 py-5 text-center"
        style={{
          background: "var(--editorial-background)",
          fontFamily: "var(--font-editorial-ui)",
        }}
      >
        <button
          onClick={resetUserMode}
          className="inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ color: "var(--editorial-on-surface-variant)" }}
        >
          מעסיקים?
          <span style={{ color: "var(--editorial-primary)", textDecoration: "underline", textUnderlineOffset: 4 }}>
            לחצו כאן לפרסום עבודה
          </span>
        </button>
      </section>
    </>
  );
}
