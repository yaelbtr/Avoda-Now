/**
 * AdminRegionsPage — /admin/regions
 *
 * Standalone admin page for managing regions.
 * Displays a full table with Create / Edit / Activate / Pause / Delete actions.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppButton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppInput, AppTextarea, AppSelect } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  Clock,
  Edit2,
  ExternalLink,
  MapPin,
  PauseCircle,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
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

const EMPTY_FORM = {
  slug: "",
  name: "",
  centerCity: "",
  centerLat: "",
  centerLng: "",
  activationRadiusKm: 15,
  radiusMinutes: 20,
  minWorkersRequired: 50,
  description: "",
  status: "collecting_workers" as RegionStatus,
};

type FormState = typeof EMPTY_FORM & { id?: number };

export default function AdminRegionsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: regions, isLoading } = trpc.regions.list.useQuery();

  const createRegion = trpc.regions.create.useMutation({
    onSuccess: () => { utils.regions.list.invalidate(); toast.success("אזור נוצר בהצלחה"); setDialog({ open: false, mode: "create", form: EMPTY_FORM }); },
    onError: (e) => toast.error(e.message),
  });

  const updateRegion = trpc.regions.update.useMutation({
    onSuccess: () => { utils.regions.list.invalidate(); toast.success("אזור עודכן"); setDialog({ open: false, mode: "create", form: EMPTY_FORM }); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.regions.updateStatus.useMutation({
    onSuccess: () => { utils.regions.list.invalidate(); toast.success("סטטוס עודכן"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRegion = trpc.regions.delete.useMutation({
    onSuccess: () => { utils.regions.list.invalidate(); toast.success("אזור נמחק"); },
    onError: (e) => toast.error(e.message),
  });

  const recount = trpc.regions.recount.useMutation({
    onSuccess: (d) => { utils.regions.list.invalidate(); toast.success(`ספירה עודכנה: ${d.count} עובדים`); },
    onError: (e) => toast.error(e.message),
  });

  const [dialog, setDialog] = useState<{ open: boolean; mode: "create" | "edit"; form: FormState }>({
    open: false, mode: "create", form: EMPTY_FORM,
  });

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number; name: string }>({
    open: false, id: 0, name: "",
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Shield className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-semibold">גישה מוגבלת — אדמינים בלבד</p>
            <AppButton variant="secondary" onClick={() => navigate("/admin")}>חזרה לפאנל</AppButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openCreate = () => setDialog({ open: true, mode: "create", form: EMPTY_FORM });
  const openEdit = (r: NonNullable<typeof regions>[0]) => setDialog({
    open: true, mode: "edit",
    form: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      centerCity: r.centerCity,
      centerLat: r.centerLat,
      centerLng: r.centerLng,
      activationRadiusKm: r.activationRadiusKm,
      radiusMinutes: r.radiusMinutes,
      minWorkersRequired: r.minWorkersRequired,
      description: r.description ?? "",
      status: r.status as RegionStatus,
    },
  });

  const handleSave = () => {
    const f = dialog.form;
    if (dialog.mode === "create") {
      createRegion.mutate({
        slug: f.slug, name: f.name, centerCity: f.centerCity,
        centerLat: f.centerLat, centerLng: f.centerLng,
        activationRadiusKm: f.activationRadiusKm, radiusMinutes: f.radiusMinutes,
        minWorkersRequired: f.minWorkersRequired, description: f.description || null,
        status: f.status,
      });
    } else if (f.id) {
      updateRegion.mutate({
        id: f.id, name: f.name, activationRadiusKm: f.activationRadiusKm,
        radiusMinutes: f.radiusMinutes, minWorkersRequired: f.minWorkersRequired,
        description: f.description || null, status: f.status,
      });
    }
  };

  const setF = (patch: Partial<FormState>) =>
    setDialog((p) => ({ ...p, form: { ...p.form, ...patch } }));

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">ניהול אזורים</h1>
            <Badge variant="secondary">{regions?.length ?? 0} אזורים</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <AppButton variant="secondary" size="sm">פאנל ניהול</AppButton>
            </Link>
            <AppButton variant="brand" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 ml-1" />
              אזור חדש
            </AppButton>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">כל האזורים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">טוען...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם האזור</TableHead>
                      <TableHead className="text-right">עיר מרכז</TableHead>
                      <TableHead className="text-right">רדיוס (דק׳)</TableHead>
                      <TableHead className="text-right">מינ׳ עובדים</TableHead>
                      <TableHead className="text-right">עובדים נוכחיים</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions?.map((r) => {
                      const pct = Math.min(100, Math.round((r.currentWorkers / r.minWorkersRequired) * 100));
                      const status = r.status as RegionStatus;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{r.centerCity}</TableCell>
                          <TableCell>{r.radiusMinutes} דק׳</TableCell>
                          <TableCell>{r.minWorkersRequired}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{r.currentWorkers}</span>
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${status === "active" ? "bg-green-500" : "bg-amber-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[status]}`}>
                              {STATUS_LABELS[status]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* View detail */}
                              <Link href={`/admin/regions/${r.id}`}>
                                <AppButton variant="secondary" size="sm" className="h-7 px-2" title="פרטים">
                                  <Users className="w-3.5 h-3.5" />
                                </AppButton>
                              </Link>
                              {/* Edit */}
                              <AppButton variant="secondary" size="sm" className="h-7 px-2" onClick={() => openEdit(r)} title="ערוך">
                                <Edit2 className="w-3.5 h-3.5" />
                              </AppButton>
                              {/* Activate */}
                              {status !== "active" && (
                                <AppButton
                                  variant="secondary" size="sm" className="h-7 px-2 text-green-600 hover:text-green-700"
                                  onClick={() => updateStatus.mutate({ id: r.id, status: "active" })}
                                  title="הפעל"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </AppButton>
                              )}
                              {/* Pause */}
                              {status === "active" && (
                                <AppButton
                                  variant="secondary" size="sm" className="h-7 px-2 text-amber-600 hover:text-amber-700"
                                  onClick={() => updateStatus.mutate({ id: r.id, status: "paused" })}
                                  title="השהה"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" />
                                </AppButton>
                              )}
                              {/* Recount */}
                              <AppButton
                                variant="secondary" size="sm" className="h-7 px-2"
                                onClick={() => recount.mutate({ id: r.id })}
                                disabled={recount.isPending}
                                title="ספור מחדש"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </AppButton>
                              {/* Landing page */}
                              <Link href={`/work/${r.slug}`} target="_blank">
                                <AppButton variant="secondary" size="sm" className="h-7 px-2" title="עמוד נחיתה">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </AppButton>
                              </Link>
                              {/* Delete */}
                              <AppButton
                                variant="secondary" size="sm" className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete({ open: true, id: r.id, name: r.name })}
                                title="מחק"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </AppButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((p) => ({ ...p, open: o }))}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "יצירת אזור חדש" : "עריכת אזור"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {dialog.mode === "create" && (
              <div>
                <AppInput
                  label="Slug (URL)"
                  value={dialog.form.slug}
                  onChange={(e) => setF({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  placeholder="tel-aviv"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">יוצר את הכתובת /work/{dialog.form.slug || "..."}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <AppInput
                label="שם האזור"
                value={dialog.form.name}
                onChange={(e) => setF({ name: e.target.value })}
                placeholder="תל אביב"
                dir="rtl"
                wrapperClassName="col-span-2"
              />
              <AppInput
                label="עיר מרכז"
                value={dialog.form.centerCity}
                onChange={(e) => setF({ centerCity: e.target.value })}
                placeholder="תל אביב"
                dir="rtl"
                wrapperClassName="col-span-2"
              />
              {dialog.mode === "create" && (
                <>
                  <AppInput
                    label="קו רוחב (Lat)"
                    value={dialog.form.centerLat}
                    onChange={(e) => setF({ centerLat: e.target.value })}
                    placeholder="32.0853"
                    dir="ltr"
                  />
                  <AppInput
                    label="קו אורך (Lng)"
                    value={dialog.form.centerLng}
                    onChange={(e) => setF({ centerLng: e.target.value })}
                    placeholder="34.7818"
                    dir="ltr"
                  />
                </>
              )}
              <AppInput
                label="רדיוס (דקות נסיעה)"
                type="number"
                min={1}
                max={120}
                value={dialog.form.radiusMinutes}
                onChange={(e) => setF({ radiusMinutes: parseInt(e.target.value) || 1 })}
                dir="ltr"
              />
              <AppInput
                label="רדיוס (ק”מ)"
                type="number"
                min={1}
                max={200}
                value={dialog.form.activationRadiusKm}
                onChange={(e) => setF({ activationRadiusKm: parseInt(e.target.value) || 1 })}
                dir="ltr"
              />
              <AppInput
                label="מינימום עובדים לפתיחה"
                type="number"
                min={1}
                value={dialog.form.minWorkersRequired}
                onChange={(e) => setF({ minWorkersRequired: parseInt(e.target.value) || 1 })}
                dir="ltr"
                wrapperClassName="col-span-2"
              />
            </div>
            <AppSelect
              label="סטטוס"
              value={dialog.form.status}
              options={[
                { value: "collecting_workers", label: "בהרצה — אוסף עובדים" },
                { value: "active", label: "פעיל — מעסיקים יכולים לפרסם" },
                { value: "paused", label: "מושהה" },
              ]}
              onChange={(e) => setF({ status: e.target.value as RegionStatus })}
            />
            <AppTextarea
              label="תיאור (לעמוד הנחיתה)"
              value={dialog.form.description}
              onChange={(e) => setF({ description: e.target.value })}
              placeholder="תיאור קצר של האזור..."
              dir="rtl"
              rows={2}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <AppButton variant="brand" onClick={handleSave} disabled={createRegion.isPending || updateRegion.isPending}>
              {dialog.mode === "create" ? "צור אזור" : "שמור שינויים"}
            </AppButton>
            <AppButton variant="secondary" onClick={() => setDialog((p) => ({ ...p, open: false }))}>ביטול</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete.open} onOpenChange={(o) => setConfirmDelete((p) => ({ ...p, open: o }))}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת אזור</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את האזור <strong>{confirmDelete.name}</strong>? פעולה זו תסיר גם את כל שיוכי העובדים לאזור זה.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <AppButton
              variant="destructive"
              onClick={() => { deleteRegion.mutate({ id: confirmDelete.id }); setConfirmDelete({ open: false, id: 0, name: "" }); }}
              disabled={deleteRegion.isPending}
            >
              מחק
            </AppButton>
            <AppButton variant="secondary" onClick={() => setConfirmDelete({ open: false, id: 0, name: "" })}>ביטול</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
