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
  preferredCities,
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
  const completionPct = Math.round((completionItems.filter((i) => i.done).length / completionItems.length) * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: "var(--page-bg)", maxHeight: "90vh", overflowY: "auto" }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            dir="rtl"
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{ background: "var(--page-bg)", borderBottom: "1px solid oklch(0.92 0.02 100)" }}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "oklch(0.68 0.14 80.8)" }}>
                  תצוגה מקדימה
                </p>
                <h2 className="text-base font-black" style={{ color: "#4F583B" }}>
                  כך נראה הפרופיל שלך למעסיקים
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/8"
                style={{ color: "#4F583B" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* ── Employer Card ── */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 2px 16px rgba(79,88,59,0.10)" }}
              >
                {/* Card header with avatar */}
                <div
                  className="px-5 pt-5 pb-4 flex items-center gap-4"
                  style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      className="w-16 h-16 rounded-full object-cover shrink-0"
                      style={{ border: "3px solid #4F583B" }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.92 0.04 122)", border: "2px dashed oklch(0.70 0.08 122)" }}
                    >
                      <User className="h-7 w-7" style={{ color: "#4F583B" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black truncate" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>
                      {name || "שם לא הוזן"}
                    </h3>
                    {phone && (
                      <p className="text-sm mt-0.5" style={{ color: "oklch(0.50 0.06 122)" }}>{phone}</p>
                    )}
                    {selectedCategoryLabels.length > 0 && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.55 0.08 122)" }}>
                        {selectedCategoryLabels.slice(0, 3).map((c) => `${c.icon} ${c.label}`).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {bio ? (
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.30 0.05 122)" }}>
                      {bio}
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <p className="text-sm italic" style={{ color: "oklch(0.65 0.04 122)" }}>
                      לא הוזן תיאור אישי
                    </p>
                  </div>
                )}

                {/* Categories */}
                {selectedCategoryLabels.length > 0 && (
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Briefcase className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
                      <span className="text-xs font-bold" style={{ color: "#4F583B" }}>תחומי עיסוק</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
                      <span className="text-xs font-bold" style={{ color: "#4F583B" }}>זמינות</span>
                    </div>
                    {selectedDayLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {selectedDayLabels.map((d) => (
                          <span
                            key={d}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "#4F583B", color: "white" }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedTimeLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTimeLabels.map((t) => (
                          <span
                            key={t.value}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: "oklch(0.93 0.04 122)", color: "#4F583B" }}
                          >
                            {t.icon} {t.label} <span className="opacity-60">({t.sub})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                <div className="px-5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
                    <span className="text-xs font-bold" style={{ color: "#4F583B" }}>אזור עבודה</span>
                  </div>
                  {locationMode === "radius" ? (
                    <p className="text-sm" style={{ color: "oklch(0.40 0.06 122)" }}>
                      עד {searchRadiusKm} ק"מ מהמיקום שלי
                    </p>
                  ) : cityNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
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
                    <p className="text-sm italic" style={{ color: "oklch(0.65 0.04 122)" }}>לא נבחרו ערים</p>
                  )}
                </div>
              </div>

              {/* ── Profile Completion ── */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold" style={{ color: "#4F583B" }}>השלמת פרופיל</span>
                  <span
                    className="text-sm font-black"
                    style={{ color: completionPct === 100 ? "oklch(0.55 0.15 145)" : "oklch(0.68 0.14 80.8)" }}
                  >
                    {completionPct}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full mb-3" style={{ background: "oklch(0.92 0.02 100)" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      background: completionPct === 100
                        ? "oklch(0.55 0.15 145)"
                        : "linear-gradient(90deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {completionItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: item.done ? "oklch(0.55 0.15 145)" : "oklch(0.75 0.03 122)" }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: item.done ? "oklch(0.35 0.06 122)" : "oklch(0.65 0.04 122)" }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                {completionPct < 100 && (
                  <p className="text-xs mt-3" style={{ color: "oklch(0.68 0.14 80.8)" }}>
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
