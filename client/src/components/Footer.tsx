import { Link } from "wouter";
import { Briefcase, Mail, Home, Search, PlusCircle, FolderOpen, FileText, ShieldCheck, Zap, Users } from "lucide-react";

const FG_PRIMARY  = "oklch(0.9904 0.0107 95.3 / 0.85)";
const FG_MUTED    = "oklch(0.9904 0.0107 95.3 / 0.45)";
const ACCENT      = "var(--citrus)";
const DIVIDER     = "oklch(1 0 0 / 0.08)";
const HOVER_COLOR = "white";

function FooterLink({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-2 text-sm transition-all duration-200"
        style={{ color: FG_PRIMARY, direction: "rtl" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = HOVER_COLOR;
          (e.currentTarget as HTMLElement).style.paddingRight = "4px";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = FG_PRIMARY;
          (e.currentTarget as HTMLElement).style.paddingRight = "0px";
        }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span>{label}</span>
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        background: "var(--footer-bg)",
        borderTop: `1px solid ${DIVIDER}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.44 0.07 124.9 / 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto px-4 pt-12 pb-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

          {/* Brand column */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
                  boxShadow: "0 4px 12px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
                }}
              >
                <Briefcase className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="font-black text-[20px]"
                  style={{
                    color: "var(--header-fg)",
                    fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
                    letterSpacing: "-0.03em",
                    textShadow: "0 1px 3px oklch(0 0 0 / 0.2)",
                  }}
                >
                  Avoda<span style={{ color: ACCENT, textShadow: "0 0 12px oklch(0.82 0.15 80.8 / 0.4)" }}>Now</span>
                </span>
                <span
                  className="text-[9px] font-bold uppercase"
                  style={{ color: FG_MUTED, letterSpacing: "0.14em" }}
                >
                  עבודה עכשיו
                </span>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-right" style={{ color: FG_MUTED }}>
              מצא עבודה או עובדים עכשיו. לוח דרושים מהיר ופשוט לעבודות זמניות.
            </p>

            <a
              href="mailto:info@avodanow.co.il"
              className="inline-flex items-center gap-2 text-sm transition-all duration-200"
              style={{ color: FG_PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.color = HOVER_COLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.color = FG_PRIMARY)}
            >
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span>info@avodanow.co.il</span>
            </a>

            {/* Stats row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
                <Zap className="h-3 w-3" style={{ color: ACCENT }} />
                <span>500+ משרות</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
                <Users className="h-3 w-3" style={{ color: ACCENT }} />
                <span>אלפי עובדים</span>
              </div>
            </div>
          </div>

          {/* Navigation column */}
          <div className="space-y-4">
            <h3
              className="font-bold text-[11px] text-right uppercase"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              ניווט
            </h3>
            <ul className="space-y-2.5 text-right">
              <FooterLink href="/" label="בית" Icon={Home} />
              <FooterLink href="/find-jobs" label="חפש עבודה" Icon={Search} />
              <FooterLink href="/post-job" label="פרסם משרה" Icon={PlusCircle} />
              <FooterLink href="/my-jobs" label="המשרות שלי" Icon={FolderOpen} />
            </ul>
          </div>

          {/* Legal column */}
          <div className="space-y-4">
            <h3
              className="font-bold text-[11px] text-right uppercase"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              מידע משפטי
            </h3>
            <ul className="space-y-2.5 text-right">
              <FooterLink href="/terms" label="תנאי שימוש" Icon={FileText} />
              <FooterLink href="/privacy" label="מדיניות פרטיות" Icon={ShieldCheck} />
            </ul>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mt-2"
              style={{
                background: "oklch(0.65 0.22 160 / 0.12)",
                color: "oklch(0.72 0.22 160)",
                border: "1px solid oklch(0.65 0.22 160 / 0.22)",
              }}
            >
              <ShieldCheck className="h-3 w-3" />
              מאובטח ומוגן
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${DIVIDER}` }}
        >
          <p
            className="text-[11px] text-center sm:text-right leading-relaxed"
            style={{ color: FG_MUTED }}
          >
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה.
          </p>
          <p className="text-[11px] whitespace-nowrap font-medium" style={{ color: FG_MUTED }}>
            © {new Date().getFullYear()} AvodaNow · כל הזכויות שמורות
          </p>
        </div>
      </div>
    </footer>
  );
}
