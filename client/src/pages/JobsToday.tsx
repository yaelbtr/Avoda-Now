import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import JobCard from "@/components/JobCard";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { JOB_CATEGORIES } from "@shared/categories";
import { Flame, Briefcase, ChevronRight } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

export default function JobsToday() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const requireLogin = (message: string) => {
    setLoginMessage(message);
    saveReturnPath(); setLoginOpen(true);
  };

  const { data: jobs = [], isLoading } = trpc.jobs.listToday.useQuery({
    category: category === "all" ? undefined : category,
    limit: 100,
  });

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <AppButton
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="h-8 w-8 text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </AppButton>
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold text-foreground">עבודות להיום</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6 text-right pr-11">
        משרות שמתחילות תוך 24 השעות הקרובות — הזדמנויות דחופות
      </p>

      {/* Category filter */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2 text-right">סנן לפי קטגוריה</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === "all"
                ? "bg-red-500 text-white border-red-500"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600"
            }`}
          >
            הכל
          </button>
          {JOB_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === cat.value
                  ? "bg-red-500 text-white border-red-500"
                  : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "מחפש..." : `${jobs.length} משרות להיום`}
        </p>
        <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
          <Flame className="h-3 w-3" />
          מתחילות תוך 24 שעות
        </div>
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <BrandLoader size="md" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Flame className="h-12 w-12 mx-auto mb-3 opacity-20 text-red-400" />
          <p className="font-medium">אין עבודות להיום כרגע</p>
          <p className="text-sm mt-1">בדוק שוב מאוחר יותר — משרות חדשות מתפרסמות כל הזמן</p>
          <AppButton
            variant="secondary"
            className="mt-4 gap-2"
            onClick={() => navigate("/find-jobs")}
          >
            <Briefcase className="h-4 w-4" />
            חפש כל המשרות
          </AppButton>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={{
                ...job,
                salary: job.salary ?? null,
                businessName: job.businessName ?? null,
              }}
              onLoginRequired={requireLogin}
            />
          ))}
        </div>
      )}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
    </div>
  );
}
