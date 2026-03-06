import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import { Briefcase, HardHat, ArrowLeft } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

interface WelcomeScreenProps {
  mode: "worker" | "employer";
  onDismiss: () => void;
}

export default function WelcomeScreen({ mode, onDismiss }: WelcomeScreenProps) {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Fetch 3 relevant urgent jobs for workers
  const urgentJobsQuery = trpc.jobs.list.useQuery(
    { limit: 3 },
    { enabled: mode === "worker" }
  );

  // Fetch 3 available workers for employers
  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: 31.7683, lng: 35.2137, radiusKm: 50, limit: 3 },
    { enabled: mode === "employer" }
  );

  /** Shared exit helper — navigates immediately, then removes overlay after animation */
  const exitTo = (path: string) => {
    // Navigate first so the correct page is already mounted behind the overlay
    navigate(path);
    setExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 400);
  };

  /** X button / "עבור לדף הבית" — always goes to home */
  const handleDismiss = () => exitTo("/");

  /** Primary CTA — worker → home, employer → post-job */
  const handleCTA = () => {
    if (mode === "worker") exitTo("/");
    else exitTo("/post-job");
  };

  const isWorker = mode === "worker";

  return (
    <div
      className={`fixed inset-0 z-40 bg-background overflow-y-auto`}
      style={{
        transition: "opacity 400ms ease, transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: visible && !exiting ? 1 : 0,
        // Slide up on enter, slide down on exit for a natural "page reveals underneath" feel
        transform: exiting
          ? "translateY(40px)"
          : visible
          ? "translateY(0)"
          : "translateY(20px)",
      }}
      dir="rtl"
    >
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
              isWorker ? "bg-orange-500" : "bg-blue-600"
            }`}
          >
            {isWorker ? (
              <HardHat className="h-8 w-8 text-white" />
            ) : (
              <Briefcase className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isWorker ? "ברוך הבא! 👋" : "ברוך הבא! 🤝"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {isWorker
              ? "הנה העבודות הדחופות ביותר כרגע — מצא עבודה ותתחיל לעבוד היום"
              : "הנה עובדים זמינים באזורך — פרסם משרה ומצא עובד תוך דקות"}
          </p>
        </div>

        {/* Content section */}
        {isWorker ? (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              🔥 עבודות דחופות עכשיו
            </h2>
            {urgentJobsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <BrandLoader size="sm" />
              </div>
            ) : urgentJobsQuery.data && urgentJobsQuery.data.length > 0 ? (
              urgentJobsQuery.data.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  onClick={() => exitTo(`/job/${job.id}`)}
                  className="cursor-pointer"
                >
                  <JobCard
                    job={{
                      ...job,
                      salary: job.salary ?? null,
                      businessName: job.businessName ?? null,
                    }}
                    showDistance={false}
                    onLoginRequired={() => {}}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין עבודות דחופות כרגע — בדוק שוב בקרוב</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              👷 עובדים זמינים כרגע
            </h2>
            {workersQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <BrandLoader size="sm" />
              </div>
            ) : workersQuery.data && workersQuery.data.length > 0 ? (
              workersQuery.data.slice(0, 3).map((worker) => (
                <div
                  key={worker.userId}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <HardHat className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {worker.userName ?? "עובד זמין"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {worker.city ?? "אזור לא ידוע"}
                      {worker.note ? ` · ${worker.note}` : ""}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    זמין עכשיו
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HardHat className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין עובדים זמינים כרגע — פרסם משרה ועובדים יפנו אליך</p>
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleCTA}
            className={`w-full gap-2 py-6 text-base font-bold ${
              isWorker
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isWorker ? (
              <>
                <Briefcase className="h-5 w-5" />
                צפה בכל העבודות
              </>
            ) : (
              <>
                <Briefcase className="h-5 w-5" />
                פרסם משרה עכשיו
              </>
            )}
          </Button>
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ArrowLeft className="h-4 w-4" />
            עבור לדף הבית
          </button>
        </div>
      </div>
    </div>
  );
}
