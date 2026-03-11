import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, Tag } from "lucide-react";

type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  groupName: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const GROUP_OPTIONS = [
  { value: "home", label: "עבודות בית" },
  { value: "events", label: "אירועים" },
  { value: "care", label: "טיפול" },
  { value: "general", label: "כללי" },
  { value: "special", label: "מיוחד" },
];

const EMPTY_FORM = {
  slug: "",
  name: "",
  icon: "💼",
  groupName: "general",
  imageUrl: "",
  isActive: true,
  sortOrder: 0,
};

/** Embeddable categories management panel — used as a tab inside Admin.tsx */
export function AdminCategoriesTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: cats = [], isLoading } = trpc.categories.adminList.useQuery();

  const createMut = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("קטגוריה נוצרה בהצלחה");
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success("קטגוריה עודכנה בהצלחה");
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = trpc.categories.toggleActive.useMutation({
    onSuccess: () => {
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("קטגוריה נמחקה");
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMut = trpc.categories.seed.useMutation({
    onSuccess: () => {
      toast.success("קטגוריות ברירת מחדל נוספו");
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon ?? "💼",
      groupName: cat.groupName ?? "general",
      imageUrl: cat.imageUrl ?? "",
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.slug || !form.name) {
      toast.error("Slug ושם הם שדות חובה");
      return;
    }
    if (editingId !== null) {
      updateMut.mutate({ id: editingId, ...form, imageUrl: form.imageUrl || undefined });
    } else {
      createMut.mutate({ ...form, imageUrl: form.imageUrl || undefined });
    }
  }

  const groupLabel = (g: string | null) => GROUP_OPTIONS.find(o => o.value === g)?.label ?? g ?? "כללי";

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">ניהול קטגוריות</h2>
          <Badge variant="secondary">{cats.length} קטגוריות</Badge>
        </div>
        <div className="flex gap-2">
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            טען ברירת מחדל
          </AppButton>
          <AppButton size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 ml-1" />
            קטגוריה חדשה
          </AppButton>
        </div>
      </div>

      {/* Table / Empty state */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">טוען קטגוריות...</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">אין קטגוריות עדיין</p>
          <AppButton onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            <RefreshCw className="h-4 w-4 ml-1" />
            טען קטגוריות ברירת מחדל
          </AppButton>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-12">#</TableHead>
                  <TableHead className="text-right">אייקון</TableHead>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">Slug</TableHead>
                  <TableHead className="text-right">קבוצה</TableHead>
                  <TableHead className="text-right">סדר</TableHead>
                  <TableHead className="text-right">פעיל</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.map((cat) => (
                  <TableRow key={cat.id} className={!cat.isActive ? "opacity-50" : ""}>
                    <TableCell className="text-muted-foreground text-sm">{cat.id}</TableCell>
                    <TableCell className="text-2xl">{cat.icon}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{groupLabel(cat.groupName)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cat.sortOrder}</TableCell>
                    <TableCell>
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={() => toggleMut.mutate({ id: cat.id })}
                        disabled={toggleMut.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <AppButton variant="outline" size="sm" onClick={() => openEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </AppButton>
                        <AppButton
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AppButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {cats.map((cat) => (
              <div
                key={cat.id}
                className={`rounded-lg border bg-card p-4 ${!cat.isActive ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cat.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{cat.slug}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{groupLabel(cat.groupName)}</Badge>
                        <span className="text-xs text-muted-foreground">סדר: {cat.sortOrder}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => toggleMut.mutate({ id: cat.id })}
                      disabled={toggleMut.isPending}
                    />
                    <div className="flex gap-1">
                      <AppButton variant="outline" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </AppButton>
                      <AppButton
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">שם *</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ניקיון"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-icon">אייקון</Label>
                <Input
                  id="cat-icon"
                  value={form.icon}
                  onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                  placeholder="🧹"
                  className="text-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug * (אותיות קטנות, מספרים, קו תחתון)</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                placeholder="cleaning"
                dir="ltr"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>קבוצה</Label>
                <Select
                  value={form.groupName}
                  onValueChange={(v) => setForm(f => ({ ...f, groupName: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-order">סדר תצוגה</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-image">קישור לתמונה (CDN URL, אופציונלי)</Label>
              <Input
                id="cat-image"
                value={form.imageUrl}
                onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://cdn.example.com/cleaning.jpg"
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>קטגוריה פעילה (מוצגת למשתמשים)</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <AppButton variant="outline" onClick={() => setDialogOpen(false)}>ביטול</AppButton>
            <AppButton
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editingId ? "שמור שינויים" : "צור קטגוריה"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת קטגוריה</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            האם אתה בטוח שברצונך למחוק קטגוריה זו? פעולה זו אינה ניתנת לביטול.
            <br />
            <span className="text-amber-600 text-sm">שים לב: משרות קיימות עם קטגוריה זו לא יושפעו.</span>
          </p>
          <DialogFooter className="gap-2">
            <AppButton variant="outline" onClick={() => setDeleteConfirmId(null)}>ביטול</AppButton>
            <AppButton
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMut.mutate({ id: deleteConfirmId })}
              disabled={deleteMut.isPending}
            >
              מחק קטגוריה
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Legacy standalone page — kept for backward compatibility, redirects to admin panel */
export default function AdminCategories() {
  return <AdminCategoriesTab />;
}
