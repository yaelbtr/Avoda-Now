import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JobCard from "@/components/JobCard";
import LoginModal from "@/components/LoginModal";
import { JOB_CATEGORIES, RADIUS_OPTIONS } from "@shared/categories";
import { MapPin, Search, Loader2, Briefcase, LocateFixed, Flame } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function FindJobs() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ?? "all";

  const [category, setCategory] = useState(initialCategory);
  const [radiusKm, setRadiusKm] = useState(10);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [, navigate] = useLocation();

  const requireLogin = (message: string) => {
    setLoginMessage(message);
    setLoginOpen(true);
  };

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        toast.success("מיקום נמצא!");
      },
      () => {
        setLocating(false);
        toast.error("לא ניתן לאתר מיקום. אנא אפשר גישה למיקום.");
      }
    );
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const searchQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm, category: category === "all" ? undefined : category, limit: 50 },
    { enabled: true }
  );

  const listQuery = trpc.jobs.list.useQuery(
    { category: category === "all" ? undefined : category, limit: 50 },
    { enabled: !userLat }
  );

  const todayQuery = trpc.jobs.listToday.useQuery(
    { category: category === "all" ? undefined : category, limit: 50 },
    { enabled: showTodayOnly }
  );

  type AnyJob = NonNullable<typeof searchQuery.data>[number] | NonNullable<typeof listQuery.data>[number];
  let jobs: AnyJob[] = showTodayOnly
    ? (todayQuery.data ?? [])
    : userLat ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading = showTodayOnly
    ? todayQuery.isLoading
    : userLat ? searchQuery.isLoading : listQuery.isLoading;

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q)
    );
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6 text-right">חפש עבודה</h1>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
        {/* Search text — icon on RIGHT for RTL */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="שליחויות, מחסן, חקלאות, מטבח..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pr-10 text-right"
          />
        </div>

        {/* Location */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={userLat ? "default" : "outline"}
            size="sm"
            onClick={getLocation}
            disabled={locating}
            className="gap-2 shrink-0"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {userLat ? "מיקום פעיל" : "השתמש במיקום שלי"}
          </Button>
          {userLat && (
            <div className="flex gap-1.5 flex-wrap">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRadiusKm(r.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    radiusKm === r.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
              showTodayOnly
                ? "bg-red-500 text-white border-red-500 shadow-sm"
                : "border-red-300 text-red-600 hover:bg-red-50"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            עבודות להיום
          </button>
          {showTodayOnly && (
            <button
              onClick={() => navigate("/jobs-today")}
              className="text-xs text-red-600 underline underline-offset-2 hover:text-red-700"
            >
              עמוד עבודות להיום המלא ←
            </button>
          )}
        </div>

        {/* Category filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 text-right">קטגוריה</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
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
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground text-right">
          {isLoading ? "מחפש..." : `${jobs.length} משרות נמצאו`}
        </p>
        {userLat && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <MapPin className="h-3 w-3" />
            ממוין לפי מרחק
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">לא נמצאו משרות</p>
          <p className="text-sm mt-1">נסה לשנות את הפילטרים או להרחיב את הרדיוס</p>
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
                distance: "distance" in job ? (job as { distance: number }).distance : undefined,
              }}
              showDistance={!!userLat}
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
