import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import { JOB_CATEGORIES } from "@shared/categories";
import { Search, Briefcase, MapPin, Loader2, ChevronLeft } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const nearbyQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: 20, limit: 6 },
    { enabled: true }
  );

  const latestQuery = trpc.jobs.list.useQuery({ limit: 6 });

  const jobs = userLat ? (nearbyQuery.data ?? []) : (latestQuery.data ?? []);
  const isLoading = userLat ? nearbyQuery.isLoading : latestQuery.isLoading;

  return (
    <div dir="rtl">
      {/* Hero */}
      <section className="hero-gradient text-white">
        <div className="max-w-2xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            לוח דרושים פעיל
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            מצא עבודה או עובדים{" "}
            <span className="text-yellow-300">עכשיו</span>
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-md mx-auto">
            עבודות זמניות, שליחויות, חקלאות, מטבח ועוד — קרוב אליך
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            <Button
              size="lg"
              className="flex-1 bg-white text-primary hover:bg-white/90 font-bold text-base h-12 gap-2"
              onClick={() => navigate("/find-jobs")}
            >
              <Search className="h-5 w-5" />
              אני מחפש עבודה
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-white/40 text-white hover:bg-white/15 font-bold text-base h-12 gap-2"
              onClick={() => navigate("/post-job")}
            >
              <Briefcase className="h-5 w-5" />
              אני מחפש עובדים
            </Button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex justify-around text-center">
            {[
              { label: "משרות פעילות", value: "500+" },
              { label: "מעסיקים", value: "200+" },
              { label: "עובדים מצאו עבודה", value: "1,000+" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-foreground mb-4 text-right">חפש לפי קטגוריה</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {JOB_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => navigate(`/find-jobs?category=${cat.value}`)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-primary leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Nearby / Latest jobs */}
      <section className="max-w-2xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {userLat ? (
              <>
                <MapPin className="h-5 w-5 text-primary" />
                משרות קרובות אליך
              </>
            ) : (
              <>
                <Briefcase className="h-5 w-5 text-primary" />
                משרות אחרונות
              </>
            )}
          </h2>
          {/* "כל המשרות" button — on LEFT side in RTL */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/find-jobs")} className="gap-1 text-primary">
            כל המשרות
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין משרות כרגע</p>
            <p className="text-sm mt-1">היה הראשון לפרסם משרה!</p>
            <Button className="mt-4" onClick={() => navigate("/post-job")}>
              פרסם משרה
            </Button>
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
              />
            ))}
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => navigate("/find-jobs")} className="gap-2">
              <Search className="h-4 w-4" />
              חפש עוד משרות
            </Button>
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="bg-primary/5 border-y border-primary/10">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">יש לך עסק?</h2>
          <p className="text-muted-foreground mb-4">פרסם משרה בחינם ומצא עובדים תוך דקות</p>
          <Button size="lg" onClick={() => navigate("/post-job")} className="gap-2">
            <Briefcase className="h-5 w-5" />
            פרסם משרה עכשיו
          </Button>
        </div>
      </section>
    </div>
  );
}
