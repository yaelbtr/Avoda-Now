import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { BadgePercent, MapPin, Users } from "lucide-react";

export function LiveStatsStrip() {
  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const regionsQuery = trpc.regions.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const registeredWorkers = heroStatsQuery.data?.registeredWorkers ?? null;
  const activeRegions = (regionsQuery.data ?? []).filter((r) => r.status === "active").length;

  if (registeredWorkers === null || registeredWorkers < 100) return null;

  const stats = [
    {
      Icon: Users,
      value: `+${registeredWorkers}`,
      label: "עובדים רשומים",
    },
    ...(activeRegions > 0
      ? [{ Icon: MapPin, value: `${activeRegions}`, label: "אזורים פעילים" }]
      : []),
    {
      Icon: BadgePercent,
      value: "100%",
      label: "ללא עמלות",
    },
  ];

  return (
    <section
      dir="rtl"
      className="px-6 pt-10 pb-12"
      style={{ background: "var(--editorial-surface-container)", fontFamily: "var(--font-editorial-ui)" }}
    >
      <motion.div
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="flex gap-2"
      >
        {stats.map(({ Icon, value, label }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 18, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 26 } } }}
            whileHover={{ y: -4, scale: 1.03, transition: { type: "spring", stiffness: 380, damping: 22 } }}
            className="flex-1 px-3 py-3 flex flex-col items-center gap-1"
            style={{
              background: "var(--editorial-surface-container-lowest)",
              border: "1px solid var(--editorial-outline-ghost)",
              borderRadius: 24,
              boxShadow: "var(--editorial-shadow)",
              minWidth: 0,
            }}
          >
            <Icon size={16} style={{ color: "var(--editorial-primary)" }} strokeWidth={2.2} />
            <span className="font-bold tabular-nums" style={{ fontSize: 17, color: "var(--editorial-on-surface)", lineHeight: 1, letterSpacing: 0 }}>
              {value}
            </span>
            <span className="font-semibold text-center" style={{ fontSize: 10, color: "var(--editorial-on-surface-variant)", lineHeight: 1.15 }}>
              {label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
