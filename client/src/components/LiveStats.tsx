import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { C_BRAND, C_AMBER, C_AMBER_HEX } from "@/lib/colors";

interface LiveStatsProps {
  mode?: "worker" | "employer";
}

export default function LiveStats({ mode = "worker" }: LiveStatsProps) {
  const statsQuery = trpc.live.stats.useQuery(undefined, {
    refetchInterval: 45_000,
    staleTime: 30_000,
  });

  const stats = statsQuery.data;

  if (!stats && statsQuery.isLoading) {
    return (
      <div
        dir="rtl"
        style={{
        background: C_BRAND,
        borderBottom: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: C_AMBER }} />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const allItems = [
    {
      icon: "👷",
      value: stats.availableWorkers,
      label: "עובדים פנויים עכשיו",
      accentColor: "oklch(0.65 0.22 160)",
      accentBg: "oklch(0.65 0.22 160 / 0.1)",
      accentBorder: "oklch(0.65 0.22 160 / 0.2)",
      pulse: stats.availableWorkers > 0,
      employerOnly: true,
    },
    {
      icon: "📢",
      value: stats.newJobsLastHour,
      label: "עבודות חדשות בשעה",
      accentColor: C_AMBER,
      accentBg: `${C_AMBER_HEX}1a`,
      accentBorder: `${C_AMBER_HEX}33`,
      pulse: false,
      employerOnly: false,
    },
    {
      icon: "⚡",
      value: stats.urgentJobsNow,
      label: "עבודות דחופות",
      accentColor: "oklch(0.65 0.22 25)",
      accentBg: "oklch(0.65 0.22 25 / 0.1)",
      accentBorder: "oklch(0.65 0.22 25 / 0.2)",
      pulse: stats.urgentJobsNow > 0,
      employerOnly: false,
    },
  ];

  const items = allItems.filter((item) => !item.employerOnly || mode === "employer");

  return (
    <div
      dir="rtl"
      style={{
        background: C_BRAND,
        borderBottom: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex justify-around gap-2">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: item.accentBg,
                border: `1px solid ${item.accentBorder}`,
              }}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div className="text-center">
                <div
                  className="text-lg font-extrabold leading-none flex items-center gap-1"
                  style={{ color: item.accentColor }}
                >
                  {item.pulse && (
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{
                        background: item.accentColor,
                        boxShadow: `0 0 6px ${item.accentColor}`,
                        animation: "pulse-ring 2s infinite",
                      }}
                    />
                  )}
                  {item.value}
                </div>
                <div
                  className="text-xs leading-tight mt-0.5 max-w-[90px]"
                  style={{ color: "oklch(1 0 0 / 40%)" }}
                >
                  {item.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
