import { X, MapPin, Clock, Briefcase, User, CheckCircle2, Star, Zap } from "lucide-react";
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
  // Employer-facing extras
  workerRating?: string | null;
  completedJobsCount?: number;
  availabilityStatus?: "available_now" | "available_today" | "available_hours" | "not_available" | null;
  distanceKm?: number | null;
}

// RTL tag row — tags start from the right edge and wrap downward
const TagRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",   // flex-start = right edge in RTL context
  }}>
    {children}
  </div>
);

// Section header: icon on the right, label to its left (inherits dir="rtl" from parent)
const SectionHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{
    display: "flex",
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

const AVAILABILITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available_now:   { label: "זמין עכשיו",   color: "#166534", bg: "#dcfce7" },
  available_today: { label: "זמין היום",    color: "#92400e", bg: "#fef3c7" },
  available_hours: { label: "זמין בשעות",   color: "#1e40af", bg: "#dbeafe" },
  not_available:   { label: "לא זמין",      color: "#6b7280", bg: "#f3f4f6" },
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1,2,3,4,5].map((i) => (
        <Star
          key={i}
          size={13}
          style={{
            color: i <= full ? "#f59e0b" : (i === full + 1 && half ? "#f59e0b" : "#d1d5db"),
            fill: i <= full ? "#f59e0b" : (i === full + 1 && half ? "#fde68a" : "none"),
          }}
        />
      ))}
      <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginRight: 2 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
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
  workerRating,
  completedJobsCount = 0,
  availabilityStatus,
  distanceKm,
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

  const ratingNum = workerRating ? parseFloat(workerRating) : null;
  const avail = availabilityStatus ? AVAILABILITY_MAP[availabilityStatus] : null;

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

          {/* Bottom Sheet — dir="rtl" on the root so every child inherits RTL */}
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

            {/* Header: title on right, X button on left */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "4px 16px 12px",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "oklch(0.68 0.14 80.8)", textTransform: "uppercase", margin: 0 }}>
                  תצוגה מקדימה
                </p>
                <h2 style={{ fontSize: 14, fontWeight: 900, color: "#4F583B", margin: 0 }}>
                  כך נראה הפרופיל שלך למעסיקים
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="סגור תצוגת פרופיל"
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
                {/* Avatar on right, text block on left — natural RTL row */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 16,
                  borderBottom: "1px solid oklch(0.95 0.02 100)",
                }}>
                  {/* Avatar — first child in RTL = rightmost */}
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      loading="lazy"
                      decoding="async"
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

                  {/* Text block — inherits RTL, text aligns right automatically */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: "#4F583B", margin: 0, lineHeight: 1.2 }}>
                      {name || "שם לא הוזן"}
                    </h3>

                    {/* Top categories summary */}
                    {selectedCategoryLabels.length > 0 && (
                      <p style={{ fontSize: 12, color: "oklch(0.50 0.08 122)", margin: "4px 0 0" }}>
                        {selectedCategoryLabels.slice(0, 2).map((c) => `${c.icon} ${c.label}`).join(" · ")}
                        {selectedCategoryLabels.length > 2 && (
                          <strong> +{selectedCategoryLabels.length - 2}</strong>
                        )}
                      </p>
                    )}

                    {/* Stats row — flex row in RTL = starts from right */}
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px 12px",
                      marginTop: 8,
                      alignItems: "center",
                    }}>
                      {/* Rating */}
                      {ratingNum !== null && ratingNum > 0 ? (
                        <StarRating rating={ratingNum} />
                      ) : (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>אין דירוג עדיין</span>
                      )}

                      {/* Completed jobs */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        fontSize: 12, color: "#4F583B", fontWeight: 600,
                      }}>
                        <Briefcase size={12} />
                        {completedJobsCount} עבודות
                      </span>

                      {/* Distance */}
                      {distanceKm !== null && distanceKm !== undefined && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 12, color: "#4F583B", fontWeight: 600,
                        }}>
                          <MapPin size={12} />
                          {distanceKm < 1 ? "פחות מ-1 ק\"מ" : `${distanceKm.toFixed(1)} ק"מ`}
                        </span>
                      )}
                    </div>

                    {/* Availability badge */}
                    {avail && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", borderRadius: 9999,
                          fontSize: 11, fontWeight: 700,
                          color: avail.color, background: avail.bg,
                        }}>
                          <Zap size={11} />
                          {avail.label}
                        </span>
                      </div>
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

                {/* Availability days/time */}
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
                {/* Title on right, percentage on left — natural RTL */}
                <div style={{
                  display: "flex",
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

                {/* Progress bar — fills from right in RTL */}
                <div style={{ width: "100%", height: 8, borderRadius: 9999, background: "oklch(0.92 0.02 100)", marginBottom: 12, overflow: "hidden" }}>
                  <div style={{
                    height: 8, borderRadius: 9999,
                    width: `${completionPct}%`,
                    marginRight: 0,
                    marginLeft: "auto",
                    background: completionPct === 100
                      ? "oklch(0.55 0.15 145)"
                      : "linear-gradient(90deg, oklch(0.68 0.14 80.8) 0%, #4F583B 100%)",
                    transition: "width 0.5s ease",
                  }} />
                </div>

                {/* Completion items grid — each row: label on right, icon on left */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
                  {completionItems.map((item) => (
                    <div key={item.label} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}>
                      <CheckCircle2
                        size={14}
                        style={{ color: item.done ? "oklch(0.55 0.15 145)" : "oklch(0.75 0.03 122)", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, color: item.done ? "oklch(0.35 0.06 122)" : "oklch(0.65 0.04 122)", textAlign: "right" }}>
                        {item.label}
                      </span>
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
