import { useAuth } from "@/_core/hooks/useAuth";
import { AdminCategoriesTab } from "./AdminCategories";
import { AdminRegionsTab } from "./AdminRegions";
import { Badge } from "@/components/ui/badge";
import { AppButton } from "@/components/ui";
import { AppInput, AppSelect, AppTextarea, AppLabel } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Ban,
  Bell,
  BellOff,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  Lock,
  LockOpen,
  MapPin,
  Phone,
  Send,
  Shield,
  Tag,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  XCircle,
  Zap,
  LogOut,
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

  // User management modals
  const [userSearch, setUserSearch] = useState("");
  const [editUserModal, setEditUserModal] = useState<{
    open: boolean;
    user: { id: number; name: string | null; phone: string | null; role: string; status: string } | null;
  }>({ open: false, user: null });
  const [editUserForm, setEditUserForm] = useState({ name: "", phone: "", role: "user" as "user" | "admin" | "test", status: "active" as "active" | "suspended" });
  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: "", phone: "", role: "user" as "user" | "admin" | "test" });

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
  const applicationsQuery = trpc.admin.listApplications.useQuery(
    { limit: 300 },
    { enabled: !!user && user.role === "admin" && activeTab === "applications" }
  );
  const batchesQuery = trpc.admin.listBatches.useQuery(
    { limit: 300 },
    { enabled: !!user && user.role === "admin" && activeTab === "batches" }
  );
  const [bdSearchTerm, setBdSearchTerm] = useState("");
  const birthdateChangesQuery = trpc.admin.getBirthdateChanges.useQuery(
    { limit: 200, offset: 0 },
    { enabled: !!user && user.role === "admin" && activeTab === "birthdate-audit" }
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
  const forceLogoutUser = trpc.admin.forceLogoutUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("המשתמש נותק בהצלחה — הסשן שלו יפוג בבקשה הבאה"); },
    onError: (e) => toast.error(e.message),
  });
  const setUserRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("תפקיד המשתמש עודכן"); },
    onError: (e) => toast.error(e.message),
  });
  const flushBatch = trpc.admin.flushBatch.useMutation({
    onSuccess: () => { utils.admin.listBatches.invalidate(); toast.success("הודעה נשלחה מיידית"); },
    onError: (e) => toast.error(e.message),
  });
  const cancelBatch = trpc.admin.cancelBatch.useMutation({
    onSuccess: () => { utils.admin.listBatches.invalidate(); toast.success("ה-batch בוטל"); },
    onError: (e) => toast.error(e.message),
  });
  const clearPhoneChangeLockout = trpc.admin.clearPhoneChangeLockout.useMutation({
    onSuccess: (data) => {
      utils.admin.listUsers.invalidate();
      toast.success(`נעילת שינוי טלפון שוחררה (${data.deletedCount} רשומות נמחקו)`);
    },
    onError: (e) => toast.error(e.message),
  });
  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); setAddUserModal(false); setAddUserForm({ name: "", phone: "", role: "user" }); toast.success("המשתמש נוצר בהצלחה"); },
    onError: (e) => toast.error(e.message),
  });
  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); setEditUserModal({ open: false, user: null }); toast.success("המשתמש עודכן"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("המשתמש נמחק"); },
    onError: (e) => toast.error(e.message),
  });

  // Employer lock
  const employerLockQuery = trpc.admin.getEmployerLock.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  const setEmployerLock = trpc.admin.setEmployerLock.useMutation({
    onSuccess: (data) => {
      utils.admin.getEmployerLock.invalidate();
      // Also invalidate the public platform settings so the gate updates immediately
      utils.platform.settings.invalidate();
      toast.success(data.active ? "נעילת מעסיקים הופעלה" : "נעילת מעסיקים בוטלה");
    },
    onError: (e) => toast.error(e.message),
  });

  // Maintenance mode
  const maintenanceModeQuery = trpc.admin.getMaintenanceMode.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  const setMaintenanceMode = trpc.admin.setMaintenanceMode.useMutation({
    onSuccess: (data) => {
      utils.admin.getMaintenanceMode.invalidate();
      // Also invalidate the public maintenance status so the gate updates immediately
      utils.maintenance.status.invalidate();
      toast.success(data.active ? "מצב תחזוקה הופעל" : "מצב תחזוקה בוטל");
    },
    onError: (e) => toast.error(e.message),
  });
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null);
  // Sync textarea with DB value once loaded (null = not yet synced)
  const maintenanceMsgFromDb = maintenanceModeQuery.data?.message ?? "";
  const displayMsg = maintenanceMsg !== null ? maintenanceMsg : maintenanceMsgFromDb;
  const setMaintenanceMessage = trpc.admin.setMaintenanceMessage.useMutation({
    onSuccess: () => {
      utils.admin.getMaintenanceMode.invalidate();
      utils.maintenance.status.invalidate();
      toast.success("ההודעה נשמרה בהצלחה");
    },
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
          {/* Mobile: 2-column grid nav */}
          <div className="md:hidden grid grid-cols-2 gap-2 mb-6">
            {[
              { value: "stats", icon: <TrendingUp className="w-4 h-4" />, label: "סטטיסטיקות" },
              { value: "jobs", icon: <Briefcase className="w-4 h-4" />, label: "משרות", badge: stats?.underReviewJobs },
              { value: "reports", icon: <Flag className="w-4 h-4" />, label: "דיווחים", badge: stats?.underReviewJobs },
              { value: "users", icon: <Users className="w-4 h-4" />, label: "משתמשים" },
              { value: "applications", icon: <Briefcase className="w-4 h-4" />, label: "מועמדויות" },
              { value: "batches", icon: <Bell className="w-4 h-4" />, label: "הודעות" },
              { value: "categories", icon: <Tag className="w-4 h-4" />, label: "קטגוריות" },
              { value: "regions", icon: <MapPin className="w-4 h-4" />, label: "אזורים" },
              { value: "maintenance", icon: <Wrench className="w-4 h-4" />, label: "תחזוקה" },
              { value: "employer-lock", icon: <Lock className="w-4 h-4" />, label: "נעילת מעסיקים" },
              { value: "birthdate-audit", icon: <Calendar className="w-4 h-4" />, label: "ביקורת גיל" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors relative ${
                  activeTab === item.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop: horizontal tabs */}
          <TabsList className="hidden md:flex mb-6 w-full justify-start">
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
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              מועמדויות
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              הודעות מקובצות
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              קטגוריות
            </TabsTrigger>
            <TabsTrigger value="regions" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              אזורים
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              תחזוקה
            </TabsTrigger>
            <TabsTrigger value="employer-lock" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              נעילת מעסיקים
            </TabsTrigger>
            <TabsTrigger value="birthdate-audit" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              ביקורת גיל
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
              <AppSelect
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "כל הסטטוסים" },
                  { value: "active", label: "פעיל" },
                  { value: "under_review", label: "בבדיקה" },
                  { value: "closed", label: "סגור" },
                  { value: "expired", label: "פג תוקף" },
                ]}
                wrapperClassName="w-44"
              />
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
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold">ניהול משתמשים ({usersQuery.data?.length ?? 0})</h2>
              <div className="flex items-center gap-2">
                <AppInput
                  placeholder="חיפוש שם / טלפון..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  dir="rtl"
                  wrapperClassName="w-48"
                />
                <AppButton
                  size="sm"
                  variant="brand"
                  onClick={() => setAddUserModal(true)}
                >
                  <Users className="w-4 h-4 ml-1" />
                  הוסף משתמש
                </AppButton>
              </div>
            </div>

            {usersQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="bg-muted/60 text-muted-foreground text-xs">
                      <th className="text-right px-3 py-2.5 font-semibold">שם</th>
                      <th className="text-right px-3 py-2.5 font-semibold">טלפון</th>
                      <th className="text-right px-3 py-2.5 font-semibold">תפקיד</th>
                      <th className="text-right px-3 py-2.5 font-semibold">קוד טסט</th>
                      <th className="text-right px-3 py-2.5 font-semibold">סטטוס</th>
                      <th className="text-right px-3 py-2.5 font-semibold">הצטרף</th>
                      <th className="text-right px-3 py-2.5 font-semibold">כניסה אחרונה</th>
                      <th className="text-right px-3 py-2.5 font-semibold">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersQuery.data ?? [])
                      .filter(u =>
                        !userSearch ||
                        (u.name ?? "").includes(userSearch) ||
                        (u.phone ?? "").includes(userSearch)
                      )
                      .map((u, idx) => (
                        <tr
                          key={u.id}
                          className={`border-t border-border transition-colors hover:bg-muted/30 ${
                            u.status === "suspended" ? "bg-red-50/40 opacity-80" : idx % 2 === 0 ? "" : "bg-muted/10"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium">{u.name ?? <span className="text-muted-foreground italic">ללא שם</span>}</td>
                          <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{u.phone ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={u.role === "admin" ? "default" : u.role === "test" ? "outline" : "secondary"}
                              className={`text-xs ${u.role === "test" ? "border-orange-400 text-orange-600" : ""}`}
                            >
                              {u.role === "admin" ? "מנהל" : u.role === "test" ? "טסט" : "משתמש"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            {u.role === "test" && u.phone ? (
                              <span
                                className="font-mono text-xs font-bold px-2 py-1 rounded bg-orange-50 border border-orange-200 text-orange-700 select-all cursor-pointer"
                                title="קוד כניסה — לחץ להעתק"
                                onClick={() => { navigator.clipboard.writeText(u.phone!.replace(/\D/g, "").slice(0, 6)); toast.success("קוד הועתק"); }}
                              >
                                {u.phone.replace(/\D/g, "").slice(0, 6)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {u.status === "suspended"
                              ? <Badge variant="destructive" className="text-xs">חסום</Badge>
                              : <Badge variant="outline" className="text-xs text-green-700 border-green-300">פעיל</Badge>
                            }
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString("he-IL")}</td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs">{new Date(u.lastSignedIn).toLocaleDateString("he-IL")}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {/* Edit */}
                              <button
                                title="ערוך"
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                onClick={() => {
                                  setEditUserForm({
                                    name: u.name ?? "",
                                    phone: u.phone ?? "",
                                    role: u.role as "user" | "admin" | "test",
                                    status: u.status as "active" | "suspended",
                                  });
                                  setEditUserModal({ open: true, user: u });
                                }}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                              {/* Block / Unblock */}
                              {u.status === "suspended" ? (
                                <button
                                  title="בטל חסימה"
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                  onClick={() => confirm("ביטול חסימה", `לבטל חסימה מהמשתמש ${u.phone}?`, () => unblockUser.mutate({ userId: u.id }))}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  title="חסום"
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                  onClick={() => confirm("חסימת משתמש", `לחסום את המשתמש ${u.phone}?`, () => blockUser.mutate({ userId: u.id }))}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Unlock phone */}
                              <button
                                title="שחרר נעילת טלפון"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                                onClick={() => confirm("שחרור נעילת טלפון", `לשחרר נעילת שינוי טלפון של ${u.phone}?`, () => clearPhoneChangeLockout.mutate({ userId: u.id }))}
                              >
                                <LockOpen className="w-3.5 h-3.5" />
                              </button>
                              {/* Force Logout */}
                              <button
                                title="נתק משתמש (בטל סשן)"
                                className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
                                onClick={() => confirm("ניתוק משתמש", `לנתק את המשתמש ${u.name || u.phone} מכל המכשירים? הסשן שלו יפוג בבקשה הבאה.`, () => forceLogoutUser.mutate({ userId: u.id }))}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                title="מחק"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                onClick={() => confirm("מחיקת משתמש", `למחוק לצמיתת את המשתמש ${u.phone}? פעולה זו בלתי הפיכה!`, () => deleteUserMutation.mutate({ userId: u.id }))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                {(usersQuery.data ?? []).filter(u =>
                  !userSearch || (u.name ?? "").includes(userSearch) || (u.phone ?? "").includes(userSearch)
                ).length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">לא נמצאו משתמשים</div>
                )}
              </div>
            )}

            {/* ─── Add User Modal ─── */}
            <Dialog open={addUserModal} onOpenChange={setAddUserModal}>
              <DialogContent dir="rtl" className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>הוסף משתמש ידנית</DialogTitle>
                  <DialogDescription>יצירת משתמש חדש במערכת ללא אימות OTP</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <AppInput
                    label="טלפון"
                    required
                    type="tel"
                    placeholder="0501234567"
                    value={addUserForm.phone}
                    onChange={(e) => setAddUserForm(f => ({ ...f, phone: e.target.value }))}
                    dir="ltr"
                  />
                  <AppInput
                    label="שם (אופציונלי)"
                    type="text"
                    placeholder="שם מלא"
                    value={addUserForm.name}
                    onChange={(e) => setAddUserForm(f => ({ ...f, name: e.target.value }))}
                    dir="rtl"
                  />
                  <AppSelect
                    label="תפקיד"
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm(f => ({ ...f, role: e.target.value as "user" | "admin" | "test" }))}
                  >
                    <option value="user">משתמש</option>
                    <option value="admin">מנהל</option>
                    <option value="test">טסט</option>
                  </AppSelect>
                </div>
                <DialogFooter className="gap-2">
                  <AppButton variant="outline" onClick={() => setAddUserModal(false)}>בטל</AppButton>
                  <AppButton
                    variant="brand"
                    disabled={!addUserForm.phone.trim() || createUserMutation.isPending}
                    onClick={() => createUserMutation.mutate(addUserForm)}
                  >
                    {createUserMutation.isPending ? "יוצר..." : "צור משתמש"}
                  </AppButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Edit User Modal ─── */}
            <Dialog open={editUserModal.open} onOpenChange={(o) => !o && setEditUserModal({ open: false, user: null })}>
              <DialogContent dir="rtl" className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>עריכת משתמש</DialogTitle>
                  <DialogDescription>{editUserModal.user?.phone}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <AppInput
                    label="שם"
                    type="text"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm(f => ({ ...f, name: e.target.value }))}
                    dir="rtl"
                  />
                  <AppInput
                    label="טלפון"
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm(f => ({ ...f, phone: e.target.value }))}
                    dir="ltr"
                  />
                  <AppSelect
                    label="תפקיד"
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm(f => ({ ...f, role: e.target.value as "user" | "admin" | "test" }))}
                  >
                    <option value="user">משתמש</option>
                    <option value="admin">מנהל</option>
                    <option value="test">טסט</option>
                  </AppSelect>
                  <AppSelect
                    label="סטטוס"
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm(f => ({ ...f, status: e.target.value as "active" | "suspended" }))}
                  >
                    <option value="active">פעיל</option>
                    <option value="suspended">חסום</option>
                  </AppSelect>
                </div>
                <DialogFooter className="gap-2">
                  <AppButton variant="outline" onClick={() => setEditUserModal({ open: false, user: null })}>בטל</AppButton>
                  <AppButton
                    variant="brand"
                    disabled={updateUserMutation.isPending}
                    onClick={() => editUserModal.user && updateUserMutation.mutate({
                      userId: editUserModal.user.id,
                      name: editUserForm.name || undefined,
                      phone: editUserForm.phone || undefined,
                      role: editUserForm.role,
                      status: editUserForm.status,
                    })}
                  >
                    {updateUserMutation.isPending ? "שומר..." : "שמור שינויים"}
                  </AppButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ─── Applications Tab ─── */}
          <TabsContent value="applications">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">מועמדויות ({applicationsQuery.data?.length ?? 0})</h2>
              <AppButton variant="secondary" size="sm" onClick={() => utils.admin.listApplications.invalidate()}>
                רענן
              </AppButton>
            </div>
            {applicationsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}><CardContent className="pt-4 pb-4"><div className="h-14 bg-muted animate-pulse rounded" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(applicationsQuery.data ?? []).map((app) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800",
                    accepted: "bg-green-100 text-green-800",
                    rejected: "bg-red-100 text-red-800",
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "ממתין",
                    accepted: "התקבל",
                    rejected: "נדחה",
                  };
                  return (
                    <Card key={app.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium">{app.workerName ?? "ללא שם"}</span>
                              <Badge className={statusColors[app.status] ?? "bg-gray-100 text-gray-700"}>
                                {statusLabels[app.status] ?? app.status}
                              </Badge>
                              {app.contactRevealed && (
                                <Badge className="bg-blue-100 text-blue-800">
                                  <Eye className="w-3 h-3 ml-1" />
                                  פרטים נחשפו
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <Phone className="w-3 h-3 inline ml-1" />
                              {app.workerPhone ?? "ללא טלפון"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <Briefcase className="w-3 h-3 inline ml-1" />
                              {app.jobTitle} {app.jobCity ? `· ${app.jobCity}` : ""}
                            </p>
                            {app.message && (
                              <p className="text-sm mt-1 italic text-muted-foreground">"{ app.message}"</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3 inline ml-1" />
                              {new Date(app.createdAt).toLocaleString("he-IL")}
                              {app.revealedAt && ` · נחשף: ${new Date(app.revealedAt).toLocaleString("he-IL")}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <AppButton
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/applications/${app.id}`, "_blank")}
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              צפה
                            </AppButton>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {applicationsQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">אין מועמדויות</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Batches Tab ─── */}
          <TabsContent value="batches">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">הודעות מקובצות ({batchesQuery.data?.length ?? 0})</h2>
              <AppButton variant="secondary" size="sm" onClick={() => utils.admin.listBatches.invalidate()}>
                רענן
              </AppButton>
            </div>
            <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <Bell className="w-4 h-4 inline ml-2" />
              <strong>לוגיקת batching:</strong> כל הגשת מועמדות פותחת חלון של 10 דקות. אם מגיעים 3 מועמדים — ההודעה נשלחת מיידית. אחרת — נשלחת בסוף החלון.
            </div>
            {batchesQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}><CardContent className="pt-4 pb-4"><div className="h-14 bg-muted animate-pulse rounded" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(batchesQuery.data ?? []).map((batch) => {
                  const batchStatusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800",
                    sent: "bg-green-100 text-green-800",
                    cancelled: "bg-gray-100 text-gray-700",
                  };
                  const batchStatusLabels: Record<string, string> = {
                    pending: "ממתין",
                    sent: "נשלח",
                    cancelled: "בוטל",
                  };
                  const isPending = batch.status === "pending";
                  const scheduledAt = new Date(batch.scheduledAt);
                  const isOverdue = isPending && scheduledAt < new Date();
                  return (
                    <Card key={batch.id} className={isOverdue ? "border-orange-300" : ""}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium">{batch.jobTitle}</span>
                              <Badge className={batchStatusColors[batch.status] ?? "bg-gray-100 text-gray-700"}>
                                {batchStatusLabels[batch.status] ?? batch.status}
                              </Badge>
                              {isOverdue && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  <AlertTriangle className="w-3 h-3 ml-1" />
                                  באיחור
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <Phone className="w-3 h-3 inline ml-1" />
                              {batch.employerPhone}
                              <span className="mx-2">·</span>
                              <Zap className="w-3 h-3 inline ml-1" />
                              {batch.pendingCount} מועמדים
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3 inline ml-1" />
                              נוצר: {new Date(batch.createdAt).toLocaleString("he-IL")}
                              {isPending && (
                                <span className="mr-3">
                                  <Send className="w-3 h-3 inline ml-1" />
                                  שליחה מתוזמנת: {scheduledAt.toLocaleString("he-IL")}
                                </span>
                              )}
                              {batch.sentAt && (
                                <span className="mr-3">
                                  <CheckCircle className="w-3 h-3 inline ml-1 text-green-600" />
                                  נשלח: {new Date(batch.sentAt).toLocaleString("he-IL")}
                                </span>
                              )}
                            </p>
                          </div>
                          {isPending && (
                            <div className="flex gap-2 flex-shrink-0">
                              <AppButton
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => confirm(
                                  "שלח הודעה עכשיו",
                                  `לשלוח SMS עם ${batch.pendingCount} מועמדים למספר ${batch.employerPhone}?`,
                                  () => flushBatch.mutate({ batchId: batch.id })
                                )}
                              >
                                <Send className="w-4 h-4 ml-1" />
                                שלח עכשיו
                              </AppButton>
                              <AppButton
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => confirm(
                                  "ביטול batch",
                                  `לבטל את ה-batch ולמנוע שליחת הודעה למספר ${batch.employerPhone}?`,
                                  () => cancelBatch.mutate({ batchId: batch.id })
                                )}
                              >
                                <BellOff className="w-4 h-4 ml-1" />
                                בטל
                              </AppButton>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {batchesQuery.data?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">אין batches</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Categories Tab ─── */}
          <TabsContent value="categories">
            <AdminCategoriesTab />
          </TabsContent>

          <TabsContent value="regions">
            <AdminRegionsTab />
          </TabsContent>

          {/* ─── Maintenance Tab ─── */}
          <TabsContent value="maintenance">
            <div className="max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-500" />
                    מצב תחזוקה
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    כשמצב תחזוקה פעיל, משתמשים רגילים יראו דף &quot;המערכת בתחזוקה&quot; במקום האתר.
                    מנהלים מקבלים גישה מלאה בכל עת.
                  </p>

                  {/* Current status indicator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{
                    background: maintenanceModeQuery.data?.active
                      ? "oklch(0.97 0.04 30)"
                      : "oklch(0.97 0.02 122)",
                    borderColor: maintenanceModeQuery.data?.active
                      ? "oklch(0.85 0.08 30)"
                      : "oklch(0.88 0.04 122)",
                  }}>
                    <div className="w-3 h-3 rounded-full" style={{
                      background: maintenanceModeQuery.data?.active
                        ? "oklch(0.65 0.18 30)"
                        : "oklch(0.55 0.14 142)",
                    }} />
                    <span className="text-sm font-medium">
                      {maintenanceModeQuery.isLoading
                        ? "טוען..."
                        : maintenanceModeQuery.data?.active
                        ? "מצב תחזוקה פעיל — האתר נעול למשתמשים רגילים"
                        : "האתר פתוח לכלל הציבור"}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <div className="flex gap-3">
                    {maintenanceModeQuery.data?.active ? (
                      <AppButton
                        variant="brand"
                        onClick={() => setMaintenanceMode.mutate({ active: false })}
                        disabled={setMaintenanceMode.isPending}
                      >
                        {setMaintenanceMode.isPending ? "מעדכן..." : "פתח את האתר לכלל הציבור"}
                      </AppButton>
                    ) : (
                      <AppButton
                        variant="destructive"
                        onClick={() =>
                          confirm(
                            "הפעלת מצב תחזוקה",
                            "משתמשים רגילים לא יוכלו להכנס לאתר עד שתבטל את המצב. האם אתה בטוח?",
                            () => setMaintenanceMode.mutate({ active: true })
                          )
                        }
                        disabled={setMaintenanceMode.isPending}
                      >
                        {setMaintenanceMode.isPending ? "מעדכן..." : "נעל את האתר (מצב תחזוקה)"}
                      </AppButton>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    הגדרה זו נשמרת במסד הנתונים ונכנסת לתוקף מידי.
                  </p>

                  {/* Custom message */}
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <AppLabel>הודעה מותאמת למשתמשים (אופציונלי)</AppLabel>
                      <p className="text-xs text-muted-foreground mb-2">
                        הטקסט יוצג בדף התחזוקה. לדוגמה: &quot;נחזור בשעה 18:00&quot;. השאר ריק להודעת ברירת מחדל.
                      </p>
                      <AppTextarea
                        dir="rtl"
                        placeholder="לדוגמה: האתר בתחזוקה מתוכננת. נחזור בשעה 18:00."
                        value={displayMsg}
                        onChange={(e) => setMaintenanceMsg(e.target.value)}
                        maxLength={500}
                        rows={3}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{displayMsg.length}/500</span>
                        <AppButton
                          variant="brand"
                          size="sm"
                          onClick={() => setMaintenanceMessage.mutate({ message: displayMsg })}
                          disabled={setMaintenanceMessage.isPending}
                        >
                          {setMaintenanceMessage.isPending ? "שומר..." : "שמור הודעה"}
                        </AppButton>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employer-lock">
            <div className="max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    נעילת גישת מעסיקים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    כשהנעילה פעילה, אזורי המעסיקים (פרסום משרה, המשרות שלי, מצב מעסיק) יחסמו לכלל המשתמשים.
                    מנהלים ומשתמשי טסט מקבלים גישה מלאה בכל עת.
                  </p>

                  {/* Current status indicator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{
                    background: employerLockQuery.data?.active
                      ? "oklch(0.97 0.04 60)"
                      : "oklch(0.97 0.02 122)",
                    borderColor: employerLockQuery.data?.active
                      ? "oklch(0.85 0.08 60)"
                      : "oklch(0.88 0.04 122)",
                  }}>
                    <div className="w-3 h-3 rounded-full" style={{
                      background: employerLockQuery.data?.active
                        ? "oklch(0.65 0.18 60)"
                        : "oklch(0.55 0.14 142)",
                    }} />
                    <span className="text-sm font-medium">
                      {employerLockQuery.isLoading
                        ? "טוען..."
                        : employerLockQuery.data?.active
                        ? "נעילת מעסיקים פעילה — הפלטפורמה פתוחה לעובדים בלבד"
                        : "הפלטפורמה פתוחה לכלל המשתמשים (עובדים ומעסיקים)"}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <div className="flex gap-3">
                    {employerLockQuery.data?.active ? (
                      <AppButton
                        variant="brand"
                        onClick={() => setEmployerLock.mutate({ active: false })}
                        disabled={setEmployerLock.isPending}
                      >
                        {setEmployerLock.isPending ? "מעדכן..." : "פתח את הפלטפורמה למעסיקים"}
                      </AppButton>
                    ) : (
                      <AppButton
                        variant="destructive"
                        onClick={() =>
                          confirm(
                            "הפעלת נעילת מעסיקים",
                            "משתמשים רגילים לא יוכלו לפרסם משרות עד שתבטל את הנעילה. האם אתה בטוח?",
                            () => setEmployerLock.mutate({ active: true })
                          )
                        }
                        disabled={setEmployerLock.isPending}
                      >
                        {setEmployerLock.isPending ? "מעדכן..." : "נעל את הפלטפורמה למעסיקים"}
                      </AppButton>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    הגדרה זו נשמרת במסד הנתונים ונכנסת לתוקף מידית.
                    מנהלים ומשתמשי טסט יכולים לגשת לכל האזורים בכל עת.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Birthdate Audit Tab ─── */}
          <TabsContent value="birthdate-audit">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold">יומן שינויי תאריך לידה</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    רשומות ביקורת לכל שינוי תאריך לידה — כולל IP, תאריך ישן וחדש.
                  </p>
                </div>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => utils.admin.getBirthdateChanges.invalidate()}
                >
                  רענן
                </AppButton>
              </div>

              {/* Search */}
              <AppInput
                placeholder="חיפוש לפי שם משתמש..."
                value={bdSearchTerm}
                onChange={(e) => setBdSearchTerm(e.target.value)}
                dir="rtl"
              />

              {birthdateChangesQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="h-10 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" dir="rtl">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">משתמש</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">תאריך ישן</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">תאריך חדש</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">שונה ב</th>
                            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">כתובת IP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(birthdateChangesQuery.data ?? [])
                            .filter((r) =>
                              !bdSearchTerm ||
                              (r.userName ?? "").toLowerCase().includes(bdSearchTerm.toLowerCase())
                            )
                            .map((row, idx) => (
                              <tr key={row.id} className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                                <td className="px-4 py-3 text-muted-foreground">{row.id}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium">{row.userName ?? <span className="text-muted-foreground">—</span>}</div>
                                  <div className="text-xs text-muted-foreground">ID: {row.userId}</div>
                                </td>
                                <td className="px-4 py-3 font-mono text-sm">
                                  {row.oldBirthDate
                                    ? new Date(row.oldBirthDate + "T00:00:00").toLocaleDateString("he-IL")
                                    : <span className="text-muted-foreground text-xs">לא היה</span>
                                  }
                                </td>
                                <td className="px-4 py-3 font-mono text-sm font-semibold">
                                  {row.newBirthDate
                                    ? new Date(row.newBirthDate + "T00:00:00").toLocaleDateString("he-IL")
                                    : <span className="text-muted-foreground text-xs">—</span>
                                  }
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {row.changedAt
                                    ? new Date(row.changedAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
                                    : "—"
                                  }
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  {row.ipAddress ?? "—"}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                      {(birthdateChangesQuery.data ?? []).filter((r) =>
                        !bdSearchTerm ||
                        (r.userName ?? "").toLowerCase().includes(bdSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                          {birthdateChangesQuery.data?.length === 0
                            ? "אין שינויי תאריך לידה במערכת"
                            : "לא נמצאו תוצאות לחיפוש"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary badge */}
              {!birthdateChangesQuery.isLoading && birthdateChangesQuery.data && (
                <p className="text-xs text-muted-foreground text-left">
                  סה&quot;כ {birthdateChangesQuery.data.length} רשומות
                </p>
              )}
            </div>
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
