import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function LiveStats() {
  const statsQuery = trpc.live.stats.useQuery(undefined, {
    refetchInterval: 45_000, // refresh every 45 seconds
    staleTime: 30_000,
  });

  const stats = statsQuery.data;

  if (!stats && statsQuery.isLoading) {
    return (
      <div className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    {
      icon: "👷",
      value: stats.availableWorkers,
      label: "עובדים פנויים עכשיו באזור",
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      pulse: stats.availableWorkers > 0,
    },
    {
      icon: "📢",
      value: stats.newJobsLastHour,
      label: "עבודות חדשות בשעה האחרונה",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      pulse: false,
    },
    {
      icon: "⚡",
      value: stats.urgentJobsNow,
      label: "עבודות דחופות פעילות",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      pulse: stats.urgentJobsNow > 0,
    },
  ];

  return (
    <div className="bg-white border-b border-border" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex justify-around gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${item.bg} ${item.border}`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div className="text-center">
                <div className={`text-lg font-extrabold leading-none ${item.color} flex items-center gap-1`}>
                  {item.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  )}
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground leading-tight mt-0.5 max-w-[90px]">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
