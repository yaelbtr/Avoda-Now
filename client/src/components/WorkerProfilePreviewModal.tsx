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

// RTL-aware tag row: items flow right-to-left and wrap downward
const TagRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: "flex",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    // align wrapped rows to the right
    justifyContent: "flex-start",
  }}>
    {children}
  </div>
);

// RTL section header: icon on right, label to its left
const SectionHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{
    display: "flex",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  }}>
    {icon}
    <span style={{ fontSize: 12, fontWeight: 700, color: "#4F583B" }}>{label}</span>
  </div>
);

const Tag = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{
    padding: "4px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    background: "oklch(0.93 0.04 122)",
    color: "#4F583B",
    whiteSpace: "nowrap",
    ...style,
  }}>
    {children}
  </span>
);

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
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            dir="rtl"
            className="relative w-full"
            style={{
              maxHeight: "88vh",
              overflowY: "auto",
              background: "var(--page-bg, #f5f0e8)",
              borderRadius: "24px 24px 0 0",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 9999, background: "oklch(0.82 0.02 100)" }} />
            </div>

            {/* Header */}
            <div style={{
              display: "flex",
              flexDirection: "row-reverse",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "4px 16px 12px",
            }}>
              {/* Title on the right (first in row-reverse) */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "oklch(0.68 0.14 80.8)", textTransform: "uppercase", margin: 0 }}>
                  תצוגה מקדימה
                </p>
                <h2 style={{ fontSize: 14, fontWeight: 900, color: "#4F583B", margin: 0 }}>
                  כך נראה הפרופיל שלך למעסיקים
                </h2>
              </div>
              {/* X button on the left (second in row-reverse) */}
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "oklch(0.93 0.02 100)", color: "#4F583B",
                  border: "none", cursor: "pointer", flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "0 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* ── Employer Card ── */}
              <div style={{
                borderRadius: 16,
                overflow: "hidden",
                width: "100%",
                background: "white",
                border: "1px solid oklch(0.92 0.02 100)",
                boxShadow: "0 2px 12px rgba(79,88,59,0.08)",
              }}>
                {/* Avatar + name row — row-reverse so avatar is on the right */}
                <div style={{
                  display: "flex",
                  flexDirection: "row-reverse",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 16,
                  borderBottom: "1px solid oklch(0.95 0.02 100)",
                }}>
                  {/* Avatar — first in DOM = rightmost in row-reverse */}
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      style={{
                        width: 64, height: 64, borderRadius: "50%",
                        objectFit: "cover", flexShrink: 0,
                        border: "2.5px solid #4F583B",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      background: "oklch(0.92 0.04 122)",
                      border: "2px dashed oklch(0.70 0.08 122)",
                    }}>
                      <User size={28} style={{ color: "#4F583B" }} />
                    </div>
                  )}
                  {/* Text — second in DOM = to the left of avatar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: "#4F583B", margin: 0, lineHeight: 1.2 }}>
                      {name || "שם לא הוזן"}
                    </h3>
                    {phone && (
                      <p style={{ fontSize: 12, color: "oklch(0.50 0.06 122)", margin: "2px 0 0" }}>
                        {phone}
                      </p>
                    )}
                    {selectedCategoryLabels.length > 0 && (
                      <p style={{ fontSize: 12, color: "oklch(0.50 0.08 122)", margin: "4px 0 0" }}>
                        {selectedCategoryLabels.slice(0, 2).map((c) => `${c.icon} ${c.label}`).join(" · ")}
                        {selectedCategoryLabels.length > 2 && (
                          <strong> +{selectedCategoryLabels.length - 2}</strong>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {(bio || true) && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    {bio ? (
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "oklch(0.30 0.05 122)", margin: 0 }}>
                        {bio}
                      </p>
                    ) : (
                      <p style={{ fontSize: 13, fontStyle: "italic", color: "oklch(0.65 0.04 122)", margin: 0 }}>
                        לא הוזן תיאור אישי
                      </p>
                    )}
                  </div>
                )}

                {/* Categories */}
                {selectedCategoryLabels.length > 0 && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <SectionHeader
                      icon={<Briefcase size={14} style={{ color: "#4F583B", flexShrink: 0 }} />}
                      label="תחומי עיסוק"
                    />
                    <TagRow>
                      {selectedCategoryLabels.map((cat) => (
                        <Tag key={cat.value}>{cat.icon} {cat.label}</Tag>
                      ))}
                    </TagRow>
                  </div>
                )}

                {/* Availability */}
                {(selectedDayLabels.length > 0 || selectedTimeLabels.length > 0) && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid oklch(0.95 0.02 100)" }}>
                    <SectionHeader
                      icon={<Clock size={14} style={{ color: "#4F583B", flexShrink: 0 }} />}
                      label="זמינות"
                    />
                    {selectedDayLabels.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <TagRow>
                          {selectedDayLabels.map((d) => (
                            <span
                              key={d}
                              style={{
                                width: 32, height: 32, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, flexShrink: 0,
                                background: "#4F583B", color: "white",
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </TagRow>
                      </div>
                    )}
                    {selectedTimeLabels.length > 0 && (
                      <TagRow>
                        {selectedTimeLabels.map((t) => (
                          <Tag key={t.value}>{t.icon} {t.label}</Tag>
                        ))}
                      </TagRow>
                    )}
                  </div>
                )}

                {/* Location */}
                <div style={{ padding: "12px 16px" }}>
                  <SectionHeader
                    icon={<MapPin size={14} style={{ color: "#4F583B", flexShrink: 0 }} />}
                    label="אזור עבודה"
                  />
                  {locationMode === "radius" ? (
                    <p style={{ fontSize: 13, color: "oklch(0.40 0.06 122)", margin: 0 }}>
                      עד {searchRadiusKm} ק"מ מהמיקום שלי
                    </p>
                  ) : cityNames.length > 0 ? (
                    <TagRow>
                      {cityNames.map((city) => (
                        <Tag key={city}>{city}</Tag>
                      ))}
                    </TagRow>
                  ) : (
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "oklch(0.65 0.04 122)", margin: 0 }}>
                      לא נבחרו ערים
                    </p>
                  )}
                </div>
              </div>

              {/* ── Profile Completion ── */}
              <div style={{
                borderRadius: 16, padding: 16, width: "100%",
                background: "white",
                border: "1px solid oklch(0.92 0.02 100)",
              }}>
                {/* Header row: % on left, label on right */}
                <div style={{
                  display: "flex",
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4F583B" }}>
                    השלמת פרופיל
                  </span>
                  <span style={{
                    fontSize: 20, fontWeight: 900,
                    color: completionPct === 100 ? "oklch(0.55 0.15 145)" : "oklch(0.68 0.14 80.8)",
                  }}>
                    {completionPct}%
                  </span>
                </div>
                {/* Progress bar — fills from right */}
                <div style={{ width: "100%", height: 8, borderRadius: 9999, background: "oklch(0.92 0.02 100)", marginBottom: 12, direction: "rtl" }}>
                  <div style={{
                    height: 8, borderRadius: 9999,
                    width: `${completionPct}%`,
                    background: completionPct === 100
                      ? "oklch(0.55 0.15 145)"
                      : "linear-gradient(270deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                {/* Grid items: text on right, icon on left */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
                  {completionItems.map((item) => (
                    <div key={item.label} style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span style={{ fontSize: 12, color: item.done ? "oklch(0.35 0.06 122)" : "oklch(0.65 0.04 122)" }}>
                        {item.label}
                      </span>
                      <CheckCircle2
                        size={14}
                        style={{ color: item.done ? "oklch(0.55 0.15 145)" : "oklch(0.75 0.03 122)", flexShrink: 0 }}
                      />
                    </div>
                  ))}
                </div>
                {completionPct < 100 && (
                  <p style={{ fontSize: 12, marginTop: 12, color: "oklch(0.68 0.14 80.8)" }}>
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
