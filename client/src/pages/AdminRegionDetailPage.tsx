/**
 * AdminRegionDetailPage — /admin/regions/:id
 *
 * Shows region details, activation progress bar, and the list of
 * workers associated with this region via worker_regions.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  CheckCircle,
  MapPin,
  PauseCircle,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

type RegionStatus = "collecting_workers" | "active" | "paused";

const STATUS_LABELS: Record<RegionStatus, string> = {
  collecting_workers: "בהרצה",
  active: "פעיל",
  paused: "מושהה",
};

const STATUS_BADGE: Record<RegionStatus, string> = {
  collecting_workers: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-gray-100 text-gray-500 border-gray-200",
};

const MATCH_LABELS: Record<string, string> = {
  gps_radius: "GPS",
  preferred_city: "עיר מועדפת",
};

export default function AdminRegionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const regionId = parseInt(id ?? "0");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: region, isLoading: regionLoading } = trpc.regions.getById.useQuery(
    { id: regionId },
    { enabled: !!regionId && !isNaN(regionId) }
  );

  const { data: workers, isLoading: workersLoading } = trpc.regions.getWorkers.useQuery(
    { id: regionId },
    { enabled: !!regionId && !isNaN(regionId) }
  );

  const updateStatus = trpc.regions.updateStatus.useMutation({
    onSuccess: () => { utils.regions.getById.invalidate({ id: regionId }); toast.success("סטטוס עודכן"); },
    onError: (e) => toast.error(e.message),
  });

  const recount = trpc.regions.recount.useMutation({
    onSuccess: (d) => {
      utils.regions.getById.invalidate({ id: regionId });
      utils.regions.getWorkers.invalidate({ id: regionId });
      toast.success(`ספירה עודכנה: ${d.count} עובדים`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Shield className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-semibold">גישה מוגבלת — אדמינים בלבד</p>
            <Link href="/admin/regions">
              <AppButton variant="secondary">חזרה לאזורים</AppButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (regionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  if (!region) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-semibold">אזור לא נמצא</p>
            <Link href="/admin/regions">
              <AppButton variant="secondary">חזרה לאזורים</AppButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = region.status as RegionStatus;
  const pct = Math.min(100, Math.round((region.currentWorkers / region.minWorkersRequired) * 100));

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/regions">
              <AppButton variant="secondary" size="sm" className="gap-1">
                <ArrowRight className="w-4 h-4" />
                אזורים
              </AppButton>
            </Link>
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">{region.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {status !== "active" && (
              <AppButton
                variant="secondary" size="sm"
                className="text-green-600 hover:text-green-700 gap-1"
                onClick={() => updateStatus.mutate({ id: regionId, status: "active" })}
                disabled={updateStatus.isPending}
              >
                <CheckCircle className="w-4 h-4" />
                הפעל
              </AppButton>
            )}
            {status === "active" && (
              <AppButton
                variant="secondary" size="sm"
                className="text-amber-600 hover:text-amber-700 gap-1"
                onClick={() => updateStatus.mutate({ id: regionId, status: "paused" })}
                disabled={updateStatus.isPending}
              >
                <PauseCircle className="w-4 h-4" />
                השהה
              </AppButton>
            )}
            {status === "paused" && (
              <AppButton
                variant="secondary" size="sm"
                className="gap-1"
                onClick={() => updateStatus.mutate({ id: regionId, status: "collecting_workers" })}
                disabled={updateStatus.isPending}
              >
                חזור להרצה
              </AppButton>
            )}
            <AppButton
              variant="secondary" size="sm"
              className="gap-1"
              onClick={() => recount.mutate({ id: regionId })}
              disabled={recount.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              ספור מחדש
            </AppButton>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">עיר מרכז</p>
              <p className="font-semibold">{region.centerCity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">רדיוס</p>
              <p className="font-semibold">{region.radiusMinutes} דק׳ / {region.activationRadiusKm} ק"מ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">עובדים נדרשים</p>
              <p className="font-semibold">{region.minWorkersRequired}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">עובדים נוכחיים</p>
              <p className="font-semibold text-primary">{region.currentWorkers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              התקדמות הפעלה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">עובדים נדרשים: {region.minWorkersRequired}</span>
              <span className="font-semibold">עובדים נוכחיים: {region.currentWorkers}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === "active" ? "bg-green-500" : "bg-amber-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {pct}% מהיעד
              {status === "collecting_workers" && pct < 100 && (
                <> — עוד {region.minWorkersRequired - region.currentWorkers} עובדים לפתיחה</>
              )}
              {pct >= 100 && status === "collecting_workers" && (
                <> — <span className="text-green-600 font-medium">ניתן להפעיל!</span></>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Workers list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              עובדים באזור
              <Badge variant="secondary">{workers?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {workersLoading ? (
              <div className="p-8 text-center text-muted-foreground">טוען עובדים...</div>
            ) : !workers || workers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>אין עובדים משויכים לאזור זה עדיין</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">עיר</TableHead>
                      <TableHead className="text-right">מרחק</TableHead>
                      <TableHead className="text-right">סוג שיוך</TableHead>
                      <TableHead className="text-right">תאריך שיוך</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {w.profilePhoto ? (
                              <img src={w.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {w.name?.[0] ?? "?"}
                              </div>
                            )}
                            <span className="font-medium text-sm">{w.name ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{w.preferredCity ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {w.distanceKm ? `${parseFloat(w.distanceKm).toFixed(1)} ק"מ` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {MATCH_LABELS[w.matchType] ?? w.matchType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString("he-IL")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
