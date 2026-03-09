import { X, MapPin, Clock, Briefcase, User, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface PreviewProps {
  open: boolean;
  onClose: () => void;
  name: string;
  photo: string | null;
  bio: string;
  categories: string[];
  categoryLabels: { value: string; label: string; icon: string }[];
  preferredDays: string[];
  preferredTimeSlots: string[];
  dayLabels: { value: string; label: string }[];
  timeSlotLabels: { value: string; label: string; icon: string; sub: string }[];
  locationMode: "city" | "radius";
  preferredCities: number[];
  cityNames?: string[];
  searchRadiusKm: number;
  phone?: string | null;
}

export function WorkerProfilePreviewModal({
  open,
  onClose,
  name,
  photo,
  bio,
  categories,
  categoryLabels,
  preferredDays,
  preferredTimeSlots,
  dayLabels,
  timeSlotLabels,
  locationMode,
  cityNames = [],
  searchRadiusKm,
  phone,
}: PreviewProps) {
  const selectedCategoryLabels = categories
    .map((v) => categoryLabels.find((c) => c.value === v))
    .filter(Boolean) as { value: string; label: string; icon: string }[];

  const selectedDayLabels = preferredDays
    .map((v) => dayLabels.find((d) => d.value === v)?.label)
    .filter(Boolean) as string[];

  const selectedTimeLabels = preferredTimeSlots
    .map((v) => timeSlotLabels.find((t) => t.value === v))
    .filter(Boolean) as { value: string; label: string; icon: string; sub: string }[];

  const completionItems = [
    { label: "תמונת פרופיל", done: !!photo },
    { label: "שם", done: !!name },
    { label: "תחומי עיסוק", done: categories.length > 0 },
    { label: "ימי זמינות", done: preferredDays.length > 0 },
    { label: "שעות זמינות", done: preferredTimeSlots.length > 0 },
    { label: "אודות", done: !!bio },
  ];
  const completionPct = Math.round(
    (completionItems.filter((i) => i.done).length / completionItems.length) * 100
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir="rtl"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="relative w-full"
            style={{
              maxHeight: "88vh",
              overflowY: "auto",
              background: "var(--page-bg)",
              borderRadius: "24px 24px 0 0",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0.82 0.02 100)" }} />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-4 pb-3 pt-1">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.93 0.02 100)", color: "#4F583B" }}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.68 0.14 80.8)" }}>
                  תצוגה מקדימה
                </p>
                <h2 className="text-sm font-black" style={{ color: "#4F583B" }}>
                  כך נראה הפרופיל שלך למעסיקים
                </h2>
              </div>
            </div>

            <div className="px-4 pb-8 space-y-3">
              {/* ── Employer Card ── */}
              <div
                className="rounded-2xl overflow-hidden w-full"
                style={{
                  background: "white",
                  border: "1px solid oklch(0.92 0.02 100)",
                  boxShadow: "0 2px 12px rgba(79,88,59,0.08)",
                }}
              >
                {/* Avatar + name row — RTL: avatar on right, text on left */}
                <div
                  className="flex items-start gap-3 p-4"
                  style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}
                >
                  {/* Avatar — first child = rightmost in RTL */}
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      className="w-16 h-16 rounded-full object-cover shrink-0"
                      style={{ border: "2.5px solid #4F583B" }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "oklch(0.92 0.04 122)",
                        border: "2px dashed oklch(0.70 0.08 122)",
                      }}
                    >
                      <User className="h-7 w-7" style={{ color: "#4F583B" }} />
                    </div>
                  )}
                  {/* Text — second child = to the left of avatar in RTL */}
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="text-lg font-black leading-tight" style={{ color: "#4F583B" }}>
                      {name || "שם לא הוזן"}
                    </h3>
                    {phone && (
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.06 122)" }}>
                        {phone}
                      </p>
                    )}
                    {selectedCategoryLabels.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.08 122)" }}>
                        {selectedCategoryLabels
                          .slice(0, 2)
                          .map((c) => `${c.icon} ${c.label}`)
                          .join(" · ")}
                        {selectedCategoryLabels.length > 2 && (
                          <span className="font-bold"> +{selectedCategoryLabels.length - 2}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div
                  className="px-4 py-3 text-right"
                  style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}
                >
                  {bio ? (
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.30 0.05 122)" }}>
                      {bio}
                    </p>
                  ) : (
                    <p className="text-sm italic" style={{ color: "oklch(0.65 0.04 122)" }}>
                      לא הוזן תיאור אישי
                    </p>
                  )}
                </div>

                {/* Categories */}
                {selectedCategoryLabels.length > 0 && (
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}
                  >
                    {/* Section header — icon then label, right-aligned */}
                    <div className="flex items-center gap-1.5 justify-end mb-2">
                      <span className="text-xs font-bold" style={{ color: "#4F583B" }}>תחומי עיסוק</span>
                      <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: "#4F583B" }} />
                    </div>
                    {/* Tags — wrap from right */}
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {selectedCategoryLabels.map((cat) => (
                        <span
                          key={cat.value}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "oklch(0.93 0.04 122)", color: "#4F583B" }}
                        >
                          {cat.icon} {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Availability */}
                {(selectedDayLabels.length > 0 || selectedTimeLabels.length > 0) && (
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}
                  >
                    <div className="flex items-center gap-1.5 justify-end mb-2">
                      <span className="text-xs font-bold" style={{ color: "#4F583B" }}>זמינות</span>
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#4F583B" }} />
                    </div>
                    {selectedDayLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end mb-2">
                        {selectedDayLabels.map((d) => (
                          <span
                            key={d}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "#4F583B", color: "white" }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedTimeLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {selectedTimeLabels.map((t) => (
                          <span
                            key={t.value}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: "oklch(0.93 0.04 122)", color: "#4F583B" }}
                          >
                            {t.icon} {t.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end mb-1.5">
                    <span className="text-xs font-bold" style={{ color: "#4F583B" }}>אזור עבודה</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#4F583B" }} />
                  </div>
                  {locationMode === "radius" ? (
                    <p className="text-sm text-right" style={{ color: "oklch(0.40 0.06 122)" }}>
                      עד {searchRadiusKm} ק"מ מהמיקום שלי
                    </p>
                  ) : cityNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {cityNames.map((city) => (
                        <span
                          key={city}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "oklch(0.93 0.04 122)", color: "#4F583B" }}
                        >
                          {city}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-right" style={{ color: "oklch(0.65 0.04 122)" }}>
                      לא נבחרו ערים
                    </p>
                  )}
                </div>
              </div>

              {/* ── Profile Completion ── */}
              <div
                className="rounded-2xl p-4 w-full"
                style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-lg font-black"
                    style={{
                      color: completionPct === 100 ? "oklch(0.55 0.15 145)" : "oklch(0.68 0.14 80.8)",
                    }}
                  >
                    {completionPct}%
                  </span>
                  <span className="text-sm font-bold" style={{ color: "#4F583B" }}>
                    השלמת פרופיל
                  </span>
                </div>
                <div className="w-full h-2 rounded-full mb-3" style={{ background: "oklch(0.92 0.02 100)" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      background:
                        completionPct === 100
                          ? "oklch(0.55 0.15 145)"
                          : "linear-gradient(90deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                  {completionItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-end gap-1.5">
                      <span
                        className="text-xs"
                        style={{ color: item.done ? "oklch(0.35 0.06 122)" : "oklch(0.65 0.04 122)" }}
                      >
                        {item.label}
                      </span>
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: item.done ? "oklch(0.55 0.15 145)" : "oklch(0.75 0.03 122)" }}
                      />
                    </div>
                  ))}
                </div>
                {completionPct < 100 && (
                  <p className="text-xs mt-3 text-right" style={{ color: "oklch(0.68 0.14 80.8)" }}>
                    💡 פרופיל מלא מגדיל את הסיכוי לקבל פניות ממעסיקים
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
