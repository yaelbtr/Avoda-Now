import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat, Loader2 } from "lucide-react";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

const WORKER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXZrKFndAo95eFwCh4AIII3H1E4Yu7Be02H1TRn5xaWhTNgB5AHDOdrQkXxe7wDOeZkg3vyRr4tjK3KrsuDX8NAVrioZsGEI0z4Bm-_ozdoQaCKpuOSWtQt7kU78geKlXTdq6S3_tym2woptkmRNCnOqmVsT8RxMCq58MbV3PANPZIJG7OtClCO021xREN6to9i8G4Z3V3BP9ox4F9U0c2OqkTa-9QGhYWV0k0sS-6iqkJu27MX-VnikcJwtaNtmD2Sy9r4km25g";
const EMPLOYER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVfysXcSHKuS_fZeUhXSL1eddN2CFaf5cM6GfP2K6-UlJNdRcasgKvnC-TrOiE6kCPfhJ7aKwMIo_24URtLV2InHHRAFLGwjItj3HOpz2c8RhJr9_o1SOwmZUP78nSpHL7aytS7SH1M62Lr1FazjB-ChdpvXwmhth5CWwYlHIlsGR6DBMIDsqdoR0oUtn2GmA4x618u39wjuu5ZiOGA1Be20pmJSL9q4nwBCIvwVDNkq8SaDRFYlPDiRu5i8_WfphQgd_-F6-mA";

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [loading, setLoading] = useState<"worker" | "employer" | null>(null);
  const [exiting, setExiting] = useState(false);

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      setExiting(true);
      setTimeout(() => onSelected(vars.mode), 400);
    },
    onSettled: () => setLoading(null),
  });

  const handleSelect = (mode: "worker" | "employer") => {
    if (loading || exiting) return;
    setLoading(mode);
    setModeMutation.mutate({ mode });
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="role-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="w-full"
          dir="rtl"
          style={{ background: "oklch(0.97 0.004 247)" }}
        >
          {/* ── Main content ── */}
          <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full">
            {/* Welcome header */}
            <motion.header
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center mb-6"
            >
              <h1
                className="text-4xl font-bold mb-3 tracking-tight"
                style={{ color: "oklch(0.20 0.015 265)" }}
              >
                ברוכים הבאים ל-<br />AvodaNow
              </h1>
              <p style={{ color: "oklch(0.45 0.012 265)" }} className="text-lg">
                איך נוכל לעזור לך היום?
              </p>
            </motion.header>

            {/* Cards */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-1 gap-6 w-full"
            >
              {/* Worker card */}
              <motion.div
                whileHover={{ boxShadow: "0 8px 30px oklch(0.58 0.20 255 / 0.18), 0 0 0 2px oklch(0.58 0.20 255 / 0.4)" }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSelect("worker")}
                className="group relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  background: "oklch(1 0 0)",
                  boxShadow: "0 4px 20px oklch(0 0 0 / 0.08)",
                  border: "1px solid oklch(0.92 0.006 247)",
                }}
              >
                <div className="w-full h-36 overflow-hidden bg-slate-100">
                  <motion.div
                    className="w-full h-full bg-cover bg-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                    style={{ backgroundImage: `url('${WORKER_IMG}')` }}
                  />
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                  <div
                    className="p-4 rounded-full mb-4"
                    style={{ background: "oklch(0.94 0.015 255)" }}
                  >
                    <HardHat className="h-8 w-8" style={{ color: "oklch(0.58 0.20 255)" }} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: "oklch(0.20 0.015 265)" }}>
                    אני מחפש עבודה
                  </h2>
                  <p className="mb-6 leading-relaxed text-sm" style={{ color: "oklch(0.45 0.012 265)" }}>
                    מציאת עבודה בקלות ובמהירות. הגש מועמדות למשרות המבטיחות ביותר בלחיצת כפתור אחת.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelect("worker"); }}
                    disabled={!!loading || exiting}
                    className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{
                      background: "oklch(0.58 0.20 255)",
                      boxShadow: "0 4px 14px oklch(0.58 0.20 255 / 0.35)",
                    }}
                  >
                    {loading === "worker" && <Loader2 className="h-5 w-5 animate-spin" />}
                    המשך כעובד
                  </button>
                </div>
              </motion.div>

              {/* Employer card */}
              <motion.div
                whileHover={{ boxShadow: "0 8px 30px oklch(0.58 0.20 255 / 0.18), 0 0 0 2px oklch(0.58 0.20 255 / 0.4)" }}
                transition={{ duration: 0.2 }}
                onClick={() => handleSelect("employer")}
                className="group relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  background: "oklch(1 0 0)",
                  boxShadow: "0 4px 20px oklch(0 0 0 / 0.08)",
                  border: "1px solid oklch(0.92 0.006 247)",
                }}
              >
                <div className="w-full h-36 overflow-hidden bg-slate-100">
                  <motion.div
                    className="w-full h-full bg-cover bg-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                    style={{ backgroundImage: `url('${EMPLOYER_IMG}')` }}
                  />
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                  <div
                    className="p-4 rounded-full mb-4"
                    style={{ background: "oklch(0.94 0.015 255)" }}
                  >
                    <Briefcase className="h-8 w-8" style={{ color: "oklch(0.58 0.20 255)" }} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: "oklch(0.20 0.015 265)" }}>
                    אני מחפש עובדים
                  </h2>
                  <p className="mb-6 leading-relaxed text-sm" style={{ color: "oklch(0.45 0.012 265)" }}>
                    גיוס יעיל והתאמה מהירה. מצא את המועמדים המושלמים לעסק שלך תוך זמן קצר בעזרת טכנולוגיה חכמה.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelect("employer"); }}
                    disabled={!!loading || exiting}
                    className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{
                      background: "oklch(0.58 0.20 255)",
                      boxShadow: "0 4px 14px oklch(0.58 0.20 255 / 0.35)",
                    }}
                  >
                    {loading === "employer" && <Loader2 className="h-5 w-5 animate-spin" />}
                    המשך כמעסיק
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
