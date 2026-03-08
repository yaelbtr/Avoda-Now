import React from "react";
import { motion } from "framer-motion";
import { MapPin, Heart, Send } from "lucide-react";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  getStartTimeLabel,
} from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { shareJobOnWhatsApp } from "@/components/JobCard";

interface CarouselJob {
  id: number;
  title: string;
  category: string;
  address: string;
  city?: string | null;
  salary?: string | null;
  salaryType: string;
  contactPhone: string | null;
  businessName?: string | null;
  startTime: string;
  startDateTime?: Date | string | null;
  isUrgent?: boolean | null;
  workersNeeded: number;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  distance?: number;
}

interface CarouselJobCardProps {
  job: CarouselJob;
  badge?: "urgent" | "today";
  onLoginRequired?: (msg: string) => void;
}

// Category-based background images
const CATEGORY_BG: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80&fit=crop",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80&fit=crop",
  cleaning: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop",
  delivery: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80&fit=crop",
  construction: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  security: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80&fit=crop",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&fit=crop",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80&fit=crop",
  events: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80&fit=crop",
  childcare: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80&fit=crop",
  eldercare: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&q=80&fit=crop",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&fit=crop",
  other: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80&fit=crop",
};

function getCategoryBg(category: string): string {
  return CATEGORY_BG[category] ?? CATEGORY_BG.other;
}

// Olive brand color
const OLIVE = "#4F583B";
const OLIVE_80 = "#4F583Bcc";

export default function CarouselJobCard({ job, badge, onLoginRequired }: CarouselJobCardProps) {
  const { isAuthenticated } = useAuth();

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isUrgent = badge === "urgent";
  const isVolunteer = job.salaryType === "volunteer";
  const bgImage = getCategoryBg(job.category);

  const handleApply = () => {
    if (!isAuthenticated) {
      onLoginRequired?.("כדי להגיש מועמדות יש להתחבר");
      return;
    }
    shareJobOnWhatsApp(job.title, job.id, job.city, job.salary, job.salaryType);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      dir="rtl"
      style={{
        background: "#ffffff",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -6px rgba(0,0,0,0.05)",
      }}
    >
      {/* ── Header image ── */}
      <section className="relative w-full" style={{ height: 200 }}>
        <img
          src={bgImage}
          alt={catLabel}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.95)" }}
          loading="lazy"
        />
        {/* Gradient: transparent → white fade at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,1) 95%)",
          }}
        />
        {/* Urgent badge — top right */}
        <div
          className="absolute top-3.5 right-3.5 px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-md"
          style={{ background: "#f25a1d" }}
        >
          {isUrgent ? "דחוף ביותר" : "דחוף ביותר"}
        </div>
      </section>

      {/* ── Content area ── */}
      <article className="px-5 pt-2 pb-5 relative">
        {/* Floating category icon — overlaps image/content boundary */}
        <div
          className="absolute w-[72px] h-[72px] bg-white rounded-xl flex items-center justify-center text-3xl border border-gray-100 transition-transform hover:scale-105"
          style={{
            top: -36,
            right: 20,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
          }}
        >
          {catIcon}
        </div>

        {/* Spacer to push content below the floating icon */}
        <div style={{ marginTop: 44 }} />

        {/* Job title */}
        <h3
          className="text-[20px] font-extrabold leading-tight mb-2 text-right"
          style={{ color: OLIVE }}
        >
          {job.title}
        </h3>

        {/* Location */}
        {location && (
          <div
            className="flex items-center gap-1 justify-end text-sm font-medium mb-3"
            style={{ color: `${OLIVE}cc` }}
          >
            <span>{job.businessName ? `${job.businessName}, ` : ""}{location}</span>
            <MapPin className="h-4 w-4 shrink-0" style={{ color: OLIVE }} />
          </div>
        )}

        {/* Divider */}
        <hr style={{ borderColor: "#f0f0f0", marginBottom: 16, marginTop: 4 }} />

        {/* Bottom info row: time badge (right) + salary (left) */}
        {isVolunteer ? (
          <div className="flex items-center justify-center gap-2 py-1 mb-4">
            <Heart
              className="h-5 w-5"
              style={{ color: "oklch(0.82 0.15 80.8)", fill: "oklch(0.82 0.15 80.8)" }}
            />
            <span className="text-[17px] font-black" style={{ color: "oklch(0.82 0.15 80.8)" }}>
              התנדבות
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            {/* Time badge — right side */}
            <div
              className="px-4 py-2 rounded-lg font-bold text-sm"
              style={{ background: "#F8F4E8", color: OLIVE }}
            >
              {getStartTimeLabel(job.startTime)}
            </div>
            {/* Salary — left side */}
            {salaryStr ? (
              <div className="flex items-baseline gap-0.5">
                <span className="font-extrabold text-2xl" style={{ color: OLIVE }}>
                  {salaryStr}
                </span>
                <span className="font-bold text-xl mr-0.5" style={{ color: OLIVE }}>₪</span>
                <span className="text-xs font-bold mr-1" style={{ color: "#6b7280" }}>/שעה</span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: "#9ca3af" }}>שכר לא צוין</span>
            )}
          </div>
        )}

        {/* CTA button */}
        <motion.button
          onClick={handleApply}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all duration-200"
          style={{
            background: OLIVE,
            boxShadow: "0 4px 14px rgba(79,88,59,0.35)",
          }}
        >
          <span>הגישו אותי להצעה זו</span>
          <Send className="h-5 w-5" />
        </motion.button>
      </article>
    </motion.div>
  );
}
