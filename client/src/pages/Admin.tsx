import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { AppButton } from "@/components/AppButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Ban,
  Briefcase,
  CheckCircle,
  Eye,
  Flag,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  delivery: "משלוחים",
  warehouse: "מחסן",
  agriculture: "חקלאות",
  kitchen: "מטבח",
  cleaning: "ניקיון",
  security: "אבטחה",
  construction: "בנייה",
  childcare: "טיפול בילדים",
  eldercare: "טיפול בקשישים",
  retail: "קמעונאות",
  events: "אירועים",
  volunteer: "התנדבות",
  other: "אחר",
};

const STATUS_LABELS: Record<string, string> = {
  active: "פעיל",
  closed: "סגור",
  expired: "פג תוקף",
  under_review: "בבדיקה",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
  expired: "bg-orange-100 text-orange-800",
  under_review: "bg-red-100 text-red-800",
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("stats");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const utils = trpc.useUtils();

  // Queries
  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const jobsQuery = trpc.admin.listJobs.useQuery(
    { status: jobStatusFilter === "all" ? undefined : jobStatusFilter, limit: 100 },
    { enabled: !!user && user.role === "admin" && activeTab === "jobs" }
  );
  const reportedJobsQuery = trpc.admin.reportedJobs.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "reports",
  });
  const reportsQuery = trpc.admin.listReports.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "reports",
  });
  const usersQuery = trpc.admin.listUsers.useQuery(
    { limit: 200 },
    { enabled: !!user && user.role === "admin" && activeTab === "users" }
  );

  // Mutations
  const approveJob = trpc.admin.approveJob.useMutation({
    onSuccess: () => { utils.admin.listJobs.invalidate(); utils.admin.reportedJobs.invalidate(); utils.admin.stats.invalidate(); toast.success("המשרה אושרה"); },
    onError: (e) => toast.error(e.message),
  });
  const rejectJob = trpc.admin.rejectJob.useMutation({
    onSuccess: () => { utils.admin.listJobs.invalidate(); utils.admin.reportedJobs.invalidate(); utils.admin.stats.invalidate(); toast.success("המשרה נדחתה"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteJobMutation = trpc.admin.deleteJob.useMutation({
    onSuccess: () => { utils.admin.listJobs.invalidate(); utils.admin.reportedJobs.invalidate(); utils.admin.stats.invalidate(); toast.success("המשרה נמחקה"); },
    onError: (e) => toast.error(e.message),
  });
  const clearReports = trpc.admin.clearReports.useMutation({
    onSuccess: () => { utils.admin.listReports.invalidate(); utils.admin.reportedJobs.invalidate(); utils.admin.stats.invalidate(); toast.success("הדיווחים נוקו"); },
    onError: (e) => toast.error(e.message),
  });
  const blockUser = trpc.admin.blockUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("המשתמש חסום"); },
    onError: (e) => toast.error(e.message),
  });
  const unblockUser = trpc.admin.unblockUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("חסימת המשתמש הוסרה"); },
    onError: (e) => toast.error(e.message),
  });
  const setUserRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("תפקיד המשתמש עודכן"); },
    onError: (e) => toast.error(e.message),
  });

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 text-center">
          <CardContent className="pt-8 pb-8">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">גישה נדחתה</h2>
            <p className="text-muted-foreground mb-6">אין לך הרשאות גישה לפאנל הניהול.</p>
            <AppButton variant="brand" onClick={() => navigate("/")}>חזרה לדף הבית</AppButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">פאנל ניהול</h1>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <Link href="/">
            <AppButton variant="secondary" size="sm">חזרה לאתר</AppButton>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              סטטיסטיקות
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              משרות
              {stats && stats.underReviewJobs > 0 && (
                <Badge variant="destructive" className="mr-1 text-xs">{stats.underReviewJobs}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              דיווחים
              {stats && stats.underReviewJobs > 0 && (
                <Badge variant="destructive" className="mr-1 text-xs">{stats.underReviewJobs}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              משתמשים
            </TabsTrigger>
          </TabsList>

          {/* ─── Stats Tab ─── */}
          <TabsContent value="stats">
            {statsQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}><CardContent className="pt-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard title="סה״כ משרות" value={stats.totalJobs} icon={Briefcase} color="bg-blue-100 text-blue-600" />
                <StatCard title="משרות פעילות" value={stats.activeJobs} icon={CheckCircle} color="bg-green-100 text-green-600" />
                <StatCard title="בבדיקה" value={stats.underReviewJobs} icon={AlertTriangle} color="bg-red-100 text-red-600" />
                <StatCard title="סה״כ משתמשים" value={stats.totalUsers} icon={Users} color="bg-purple-100 text-purple-600" />
                <StatCard title="סה״כ דיווחים" value={stats.totalReports} icon={Flag} color="bg-orange-100 text-orange-600" />
                <StatCard title="משתמשים חדשים היום" value={stats.newUsersToday} icon={UserCheck} color="bg-teal-100 text-teal-600" />
              </div>
            ) : null}
          </TabsContent>

          {/* ─── Jobs Tab ─── */}
          <TabsContent value="jobs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold">ניהול משרות ({jobsQuery.data?.length ?? 0})</h2>
              <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סנן לפי סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="under_review">בבדיקה</SelectItem>
                  <SelectItem value="closed">סגור</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {jobsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}><CardContent className="pt-4 pb-4"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(jobsQuery.data ?? []).map((job) => (
                  <Card key={job.id} className={job.status === "under_review" ? "border-red-300 bg-red-50/30" : ""}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link href={`/job/${job.id}`}>
                              <span className="font-semibold hover:underline cursor-pointer">{job.title}</span>
                            </Link>
                            <Badge className={STATUS_COLORS[job.status] ?? ""}>{STATUS_LABELS[job.status] ?? job.status}</Badge>
                            <Badge variant="outline">{CATEGORY_LABELS[job.category] ?? job.category}</Badge>
                            {job.reportCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <Flag className="w-3 h-3 ml-1" />
                                {job.reportCount} דיווחים
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.city ?? job.address} · {job.contactName} · {job.contactPhone}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            פורסם: {new Date(job.createdAt).toLocaleDateString("he-IL")}
                            {job.expiresAt && ` · פג תוקף: ${new Date(job.expiresAt).toLocaleDateString("he-IL")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/job/${job.id}`}>
                            <AppButton variant="secondary" size="sm">
                              <Eye className="w-4 h-4" />
                            </AppButton>
                          </Link>
                          {job.status === "under_review" && (
                            <AppButton
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => confirm("אישור משרה", `לאשר את המשרה "${job.title}"?`, () => approveJob.mutate({ jobId: job.id }))}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </AppButton>
                          )}
                          <AppButton
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => confirm("דחיית משרה", `לדחות ולהסתיר את המשרה "${job.title}"?`, () => rejectJob.mutate({ jobId: job.id }))}
                          >
                            <XCircle className="w-4 h-4" />
                          </AppButton>
                          <AppButton
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => confirm("מחיקת משרה", `למחוק לצמיתות את המשרה "${job.title}"?`, () => deleteJobMutation.mutate({ jobId: job.id }))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </AppButton>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {jobsQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">אין משרות להצגה</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Reports Tab ─── */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Reported Jobs */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  משרות בבדיקה ({reportedJobsQuery.data?.length ?? 0})
                </h2>
                {reportedJobsQuery.isLoading ? (
                  <div className="h-20 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="space-y-3">
                    {(reportedJobsQuery.data ?? []).map((job) => (
                      <Card key={job.id} className="border-red-300 bg-red-50/30">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Link href={`/job/${job.id}`}>
                                  <span className="font-semibold hover:underline cursor-pointer">{job.title}</span>
                                </Link>
                                <Badge variant="destructive">{job.reportCount} דיווחים</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{job.city ?? job.address} · {job.contactName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AppButton
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => confirm("אישור משרה", `לאשר ולנקות דיווחים עבור "${job.title}"?`, () => {
                                  approveJob.mutate({ jobId: job.id });
                                  clearReports.mutate({ jobId: job.id });
                                })}
                              >
                                <CheckCircle className="w-4 h-4 ml-1" />
                                אשר
                              </AppButton>
                              <AppButton
                                size="sm"
                                variant="destructive"
                                onClick={() => confirm("מחיקת משרה", `למחוק את המשרה "${job.title}"?`, () => deleteJobMutation.mutate({ jobId: job.id }))}
                              >
                                <Trash2 className="w-4 h-4 ml-1" />
                                מחק
                              </AppButton>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {reportedJobsQuery.data?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">אין משרות בבדיקה</div>
                    )}
                  </div>
                )}
              </div>

              {/* All Reports Log */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-orange-500" />
                  יומן דיווחים ({reportsQuery.data?.length ?? 0})
                </h2>
                {reportsQuery.isLoading ? (
                  <div className="h-20 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="space-y-2">
                    {(reportsQuery.data ?? []).map((report) => (
                      <Card key={report.id}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <Link href={`/job/${report.jobId}`}>
                                <span className="font-medium hover:underline cursor-pointer text-sm">{report.jobTitle ?? `משרה #${report.jobId}`}</span>
                              </Link>
                              {report.jobStatus && (
                                <Badge className={`mr-2 text-xs ${STATUS_COLORS[report.jobStatus] ?? ""}`}>{STATUS_LABELS[report.jobStatus] ?? report.jobStatus}</Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {report.reason ?? "ללא סיבה"} · {report.reporterPhone ?? "אנונימי"} · {new Date(report.createdAt).toLocaleDateString("he-IL")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {reportsQuery.data?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">אין דיווחים</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Users Tab ─── */}
          <TabsContent value="users">
            <h2 className="text-lg font-semibold mb-4">ניהול משתמשים ({usersQuery.data?.length ?? 0})</h2>
            {usersQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}><CardContent className="pt-4 pb-4"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(usersQuery.data ?? []).map((u) => (
                  <Card key={u.id} className={u.status === "suspended" ? "border-red-300 bg-red-50/30 opacity-75" : ""}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium">{u.name ?? "ללא שם"}</span>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role === "admin" ? "מנהל" : "משתמש"}
                            </Badge>
                            {u.status === "suspended" && (
                              <Badge variant="destructive">חסום</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {u.phone ?? "ללא טלפון"} · הצטרף: {new Date(u.createdAt).toLocaleDateString("he-IL")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            כניסה אחרונה: {new Date(u.lastSignedIn).toLocaleDateString("he-IL")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {u.status === "suspended" ? (
                            <AppButton
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => confirm("הסרת חסימה", `להסיר חסימה מהמשתמש ${u.phone}?`, () => unblockUser.mutate({ userId: u.id }))}
                            >
                              <UserCheck className="w-4 h-4 ml-1" />
                              בטל חסימה
                            </AppButton>
                          ) : (
                            <AppButton
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => confirm("חסימת משתמש", `לחסום את המשתמש ${u.phone}?`, () => blockUser.mutate({ userId: u.id }))}
                            >
                              <Ban className="w-4 h-4 ml-1" />
                              חסום
                            </AppButton>
                          )}
                          {u.role !== "admin" && (
                            <AppButton
                              size="sm"
                              variant="outline"
                              onClick={() => confirm("קידום למנהל", `לקדם את ${u.phone} לתפקיד מנהל?`, () => setUserRole.mutate({ userId: u.id, role: "admin" }))}
                            >
                              <Shield className="w-4 h-4 ml-1" />
                              קדם למנהל
                            </AppButton>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {usersQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">אין משתמשים</div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <AppButton
              variant="destructive"
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog((p) => ({ ...p, open: false }));
              }}
            >
              אישור
            </AppButton>
            <AppButton variant="secondary" onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}>
              ביטול
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
