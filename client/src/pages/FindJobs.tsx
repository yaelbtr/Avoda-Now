import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JobCard from "@/components/JobCard";
import LoginModal from "@/components/LoginModal";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES, RADIUS_OPTIONS } from "@shared/categories";
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
  const [showUrgentToday, setShowUrgentToday] = useState(
    params.get("urgent") === "1" || params.get("help") === "1"
  );
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
    { enabled: showUrgentToday }
  );

  type AnyJob = NonNullable<typeof searchQuery.data>[number] | NonNullable<typeof listQuery.data>[number];
  // Base job list: when urgentToday is on, merge today-jobs + urgent jobs from main list
  let jobs: AnyJob[] = userLat ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading = userLat ? searchQuery.isLoading : listQuery.isLoading;

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q)
    );
  }

  // "דחוף להיום" — isUrgent OR startDateTime within 24h
  if (showUrgentToday) {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    const todayJobIds = new Set((todayQuery.data ?? []).map((j) => j.id));
    jobs = jobs.filter((j) => {
      const isUrgentJob = (j as { isUrgent?: boolean | null }).isUrgent;
      const isToday = todayJobIds.has(j.id);
      const startDt = (j as { startDateTime?: string | null }).startDateTime;
      const startsWithin24h = startDt ? new Date(startDt).getTime() <= in24h : false;
      return isUrgentJob || isToday || startsWithin24h;
    });
  }

  // Sort urgent jobs to top
  jobs = [...jobs].sort((a, b) => {
    const aUrgent = (a as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    const bUrgent = (b as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    return bUrgent - aUrgent;
  });

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6 text-right">חפש עבודה</h1>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-5" dir="rtl">

        {/* 1. Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="חפש לפי תפקיד, עיר או מילת מפתח..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pr-10 text-right"
          />
        </div>

        {/* 2. Quick filter: urgent today */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">סינון מהיר</p>
          <button
            onClick={() => setShowUrgentToday(!showUrgentToday)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
              showUrgentToday
                ? "bg-red-500 text-white border-red-500 shadow-sm"
                : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
            }`}
          >
            <Flame className="h-4 w-4" />
            דחוף להיום
            <span className="text-xs font-normal opacity-80">— עבודות דחופות ועבודות שמתחילות היום</span>
          </button>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* 3. Category */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">קטגוריה</p>
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

        {/* 4. Special categories — wartime / Passover / volunteer */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">קטגוריות מיוחדות</p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_CATEGORIES.map((cat) => {
              const colorMap: Record<string, { active: string; inactive: string }> = {
                purple: { active: "bg-purple-600 text-white border-purple-600", inactive: "border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100" },
                amber:  { active: "bg-amber-500 text-white border-amber-500",   inactive: "border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100" },
                green:  { active: "bg-green-600 text-white border-green-600",   inactive: "border-green-400 text-green-700 bg-green-50 hover:bg-green-100" },
              };
              const colors = colorMap[cat.color] ?? colorMap.purple;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(isActive ? "all" : cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                    isActive ? colors.active : colors.inactive
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Location */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">מיקום</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={userLat ? "default" : "outline"}
              size="sm"
              onClick={getLocation}
              disabled={locating}
              className="gap-2 shrink-0"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {userLat ? "מיקום פעיל" : "אתר עבודות קרוב אלי"}
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
