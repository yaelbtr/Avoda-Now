/**
 * AdminRegionsTab — Regions management tab for the Admin panel.
 * Lists all regions with their worker counts, status, and allows
 * admins to change status, update thresholds, and recount workers.
 */
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Users, RefreshCw, ExternalLink, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type RegionStatus = "collecting_workers" | "active" | "paused";

const STATUS_LABELS: Record<RegionStatus, string> = {
  collecting_workers: "בהרצה",
  active: "פעיל",
  paused: "מושהה",
};

const STATUS_COLORS: Record<RegionStatus, string> = {
  collecting_workers: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-gray-100 text-gray-600 border-gray-200",
};

interface EditDialogState {
  open: boolean;
  regionId: number;
  name: string;
  minWorkersRequired: number;
  activationRadiusKm: number;
  description: string;
  status: RegionStatus;
}

export function AdminRegionsTab() {
  const utils = trpc.useUtils();

  const { data: regions, isLoading } = trpc.regions.list.useQuery();

  const updateStatus = trpc.regions.updateStatus.useMutation({
    onSuccess: () => {
      utils.regions.list.invalidate();
      toast.success("סטטוס האזור עודכן");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRegion = trpc.regions.update.useMutation({
    onSuccess: () => {
      utils.regions.list.invalidate();
      toast.success("האזור עודכן בהצלחה");
      setEditDialog((p) => ({ ...p, open: false }));
    },
    onError: (err) => toast.error(err.message),
  });

  const recount = trpc.regions.recount.useMutation({
    onSuccess: (data) => {
      utils.regions.list.invalidate();
      toast.success(`ספירה עודכנה: ${data.count} עובדים`);
    },
    onError: (err) => toast.error(err.message),
  });

  const seedRegions = trpc.regions.seed.useMutation({
    onSuccess: () => {
      utils.regions.list.invalidate();
      toast.success("אזורים ראשוניים נוצרו");
    },
    onError: (err) => toast.error(err.message),
  });

  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    regionId: 0,
    name: "",
    minWorkersRequired: 50,
    activationRadiusKm: 15,
    description: "",
    status: "collecting_workers",
  });

  const openEdit = (region: NonNullable<typeof regions>[0]) => {
    setEditDialog({
      open: true,
      regionId: region.id,
      name: region.name,
      minWorkersRequired: region.minWorkersRequired,
      activationRadiusKm: region.activationRadiusKm,
      description: region.description ?? "",
      status: region.status as RegionStatus,
    });
  };

  const handleSaveEdit = () => {
    updateRegion.mutate({
      id: editDialog.regionId,
      name: editDialog.name,
      minWorkersRequired: editDialog.minWorkersRequired,
      activationRadiusKm: editDialog.activationRadiusKm,
      description: editDialog.description || null,
      status: editDialog.status,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">ניהול אזורים</h2>
          <p className="text-sm text-muted-foreground">
            {regions?.length ?? 0} אזורים רשומים
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/regions">
            <AppButton variant="brand" size="sm">
              ניהול מלא
            </AppButton>
          </Link>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => seedRegions.mutate()}
            disabled={seedRegions.isPending}
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            הוסף אזורים ראשוניים
          </AppButton>
        </div>
      </div>

      {/* Region cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions?.map((region) => {
          const pct = Math.min(100, Math.round((region.currentWorkers / region.minWorkersRequired) * 100));
          const status = region.status as RegionStatus;
          return (
            <Card key={region.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{region.name}</CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {region.centerCity}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Worker progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3" />
                      {region.currentWorkers} / {region.minWorkersRequired} עובדים
                    </span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status === "active" ? "bg-green-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Radius */}
                <p className="text-xs text-muted-foreground">
                  רדיוס: {region.activationRadiusKm} ק"מ
                </p>

                {/* Status change */}
                <div className="flex gap-2">
                  <Select
                    value={status}
                    onValueChange={(val) =>
                      updateStatus.mutate({ id: region.id, status: val as RegionStatus })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collecting_workers">בהרצה</SelectItem>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="paused">מושהה</SelectItem>
                    </SelectContent>
                  </Select>

                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => recount.mutate({ id: region.id })}
                    disabled={recount.isPending}
                    title="ספור מחדש"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </AppButton>

                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => openEdit(region)}
                    title="ערוך"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </AppButton>

                  <Link href={`/admin/regions/${region.id}`}>
                    <AppButton
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2"
                      title="פרטי אזור"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </AppButton>
                  </Link>

                  <Link href={`/work/${region.slug}`} target="_blank">
                    <AppButton
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2"
                      title="עמוד נחיתה"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </AppButton>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog((p) => ({ ...p, open }))}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת אזור</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>שם האזור</Label>
              <Input
                value={editDialog.name}
                onChange={(e) => setEditDialog((p) => ({ ...p, name: e.target.value }))}
                placeholder="שם האזור בעברית"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>מינימום עובדים</Label>
                <Input
                  type="number"
                  min={1}
                  value={editDialog.minWorkersRequired}
                  onChange={(e) => setEditDialog((p) => ({ ...p, minWorkersRequired: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>רדיוס (ק"מ)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editDialog.activationRadiusKm}
                  onChange={(e) => setEditDialog((p) => ({ ...p, activationRadiusKm: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>סטטוס</Label>
              <Select
                value={editDialog.status}
                onValueChange={(val) => setEditDialog((p) => ({ ...p, status: val as RegionStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collecting_workers">בהרצה — אוסף עובדים</SelectItem>
                  <SelectItem value="active">פעיל — מעסיקים יכולים לפרסם</SelectItem>
                  <SelectItem value="paused">מושהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>תיאור (לעמוד הנחיתה)</Label>
              <Input
                value={editDialog.description}
                onChange={(e) => setEditDialog((p) => ({ ...p, description: e.target.value }))}
                placeholder="תיאור קצר של האזור..."
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <AppButton
              variant="brand"
              onClick={handleSaveEdit}
              disabled={updateRegion.isPending}
            >
              שמור שינויים
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => setEditDialog((p) => ({ ...p, open: false }))}
            >
              ביטול
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
