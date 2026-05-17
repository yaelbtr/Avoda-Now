import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppInput, AppSelect } from "@/components/ui";
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
import { Plus, Pencil, Trash2, RefreshCw, Tag, Merge, FolderPlus } from "lucide-react";

type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  groupName: string | null;
  imageUrl: string | null;
  isActive: boolean;
  allowedForMinors: boolean;
  sortOrder: number;
  workerCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryGroup = {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
};

const EMPTY_FORM = {
  slug: "",
  name: "",
  icon: "💼",
  groupName: "general",
  imageUrl: "",
  isActive: true,
  allowedForMinors: true,
  sortOrder: 0,
};

/** Embeddable categories management panel - used as a tab inside Admin.tsx */
export function AdminCategoriesTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [mergeFrom, setMergeFrom] = useState<Category | null>(null);
  const [mergeToSlug, setMergeToSlug] = useState("");

  // ניהול קבוצות
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ slug: "", name: "", sortOrder: 0 });
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: cats = [], isLoading } = trpc.categories.adminList.useQuery();
  const { data: groups = [] } = trpc.categoryGroups.list.useQuery();

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

  const mergeMut = trpc.categories.merge.useMutation({
    onSuccess: () => {
      toast.success("הקטגוריות אוחדו בהצלחה");
      utils.categories.adminList.invalidate();
      utils.categories.list.invalidate();
      setMergeFrom(null);
      setMergeToSlug("");
    },
    onError: (e) => toast.error(e.message),
  });

  const createGroupMut = trpc.categoryGroups.create.useMutation({
    onSuccess: () => { toast.success("קבוצה נוצרה"); utils.categoryGroups.list.invalidate(); setGroupDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateGroupMut = trpc.categoryGroups.update.useMutation({
    onSuccess: () => { toast.success("קבוצה עודכנה"); utils.categoryGroups.list.invalidate(); setGroupDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGroupMut = trpc.categoryGroups.delete.useMutation({
    onSuccess: () => { toast.success("קבוצה נמחקה"); utils.categoryGroups.list.invalidate(); utils.categories.adminList.invalidate(); setDeleteGroupId(null); },
    onError: (e) => toast.error(e.message),
  });

  const syncMut = trpc.categories.syncMissing.useMutation({
    onSuccess: (res) => {
      if (res.count === 0) {
        toast.success("כל הקטגוריות כבר קיימות ב-DB");
      } else {
        toast.success(`נוספו ${res.count} קטגוריות חסרות: ${res.inserted.join(", ")}`);
        utils.categories.adminList.invalidate();
        utils.categories.list.invalidate();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const groupOptions = groups.map((g) => ({ value: g.slug, label: g.name }));
  const groupLabel = (slug: string | null) => groups.find((g) => g.slug === slug)?.name ?? slug ?? "כללי";

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupForm({ slug: "", name: "", sortOrder: groups.length });
    setGroupDialogOpen(true);
  }
  function openEditGroup(g: CategoryGroup) {
    setEditingGroup(g);
    setGroupForm({ slug: g.slug, name: g.name, sortOrder: g.sortOrder });
    setGroupDialogOpen(true);
  }
  function handleGroupSubmit() {
    if (!groupForm.name) { toast.error("שם הקבוצה הוא שדה חובה"); return; }
    if (editingGroup) {
      updateGroupMut.mutate({ id: editingGroup.id, name: groupForm.name, sortOrder: groupForm.sortOrder });
    } else {
      if (!groupForm.slug) { toast.error("Slug הוא שדה חובה"); return; }
      createGroupMut.mutate(groupForm);
    }
  }

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
      allowedForMinors: cat.allowedForMinors,
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
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            title="מוסיף קטגוריות חדשות מה-seed שחסרות ב-DB"
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            סנכרן קטגוריות חסרות
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            טען ברירת מחדל
          </AppButton>
          <AppButton variant="outline" size="sm" onClick={openCreateGroup}>
            <FolderPlus className="h-4 w-4 ml-1" />
            קבוצה חדשה
          </AppButton>
          <AppButton size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 ml-1" />
            קטגוריה חדשה
          </AppButton>
        </div>
      </div>

      {/* Groups section */}
      {groups.length > 0 && (
        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-3 text-muted-foreground">קבוצות קטגוריות</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-1 bg-background border rounded-full px-3 py-1 text-sm">
                <span>{g.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({g.slug})</span>
                <button onClick={() => openEditGroup(g)} className="text-muted-foreground hover:text-foreground ml-1">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => setDeleteGroupId(g.id)} className="text-destructive/60 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <TableHead className="text-right">נרשמו</TableHead>
                  <TableHead className="text-right">פעיל</TableHead>
                  <TableHead className="text-right">קטינים</TableHead>
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
                      <Badge variant={cat.workerCount > 0 ? "secondary" : "outline"} className="text-xs">
                        {cat.workerCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={() => toggleMut.mutate({ id: cat.id })}
                        disabled={toggleMut.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cat.allowedForMinors}
                        onCheckedChange={(v) => updateMut.mutate({ id: cat.id, allowedForMinors: v })}
                        disabled={updateMut.isPending}
                        title="מותר לקטינים"
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
                          title="מזג לתוך קטגוריה אחרת"
                          onClick={() => { setMergeFrom(cat); setMergeToSlug(""); }}
                        >
                          <Merge className="h-3.5 w-3.5" />
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
                        <Badge variant={cat.workerCount > 0 ? "secondary" : "outline"} className="text-xs">
                          {cat.workerCount} נרשמו
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => toggleMut.mutate({ id: cat.id })}
                      disabled={toggleMut.isPending}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">קטינים</span>
                      <Switch
                        checked={cat.allowedForMinors}
                        onCheckedChange={(v) => updateMut.mutate({ id: cat.id, allowedForMinors: v })}
                        disabled={updateMut.isPending}
                      />
                    </div>
                    <div className="flex gap-1">
                      <AppButton variant="outline" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </AppButton>
                      <AppButton
                        variant="outline"
                        size="sm"
                        title="מזג לתוך קטגוריה אחרת"
                        onClick={() => { setMergeFrom(cat); setMergeToSlug(""); }}
                      >
                        <Merge className="h-3.5 w-3.5" />
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
              <AppInput
                id="cat-name"
                label="שם"
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ניקיון"
                dir="rtl"
              />
              <AppInput
                id="cat-icon"
                label="אייקון"
                value={form.icon}
                onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🧹"
              />
            </div>
            <AppInput
              id="cat-slug"
              label="Slug * (אותיות קטנות, מספרים, קו תחתון)"
              value={form.slug}
              onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
              placeholder="cleaning"
              dir="ltr"
            />
            <div className="grid grid-cols-2 gap-4">
              <AppSelect
                label="קבוצה"
                value={form.groupName}
                options={groupOptions}
                onChange={(e) => setForm(f => ({ ...f, groupName: e.target.value }))}
              />
              <AppInput
                id="cat-order"
                label="סדר תצוגה"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                min={0}
                dir="ltr"
              />
            </div>
            <AppInput
              id="cat-image"
              label="קישור לתמונה (CDN URL, אופציונלי)"
              value={form.imageUrl}
              onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://cdn.example.com/cleaning.jpg"
              dir="ltr"
            />
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>קטגוריה פעילה (מוצגת למשתמשים)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.allowedForMinors}
                onCheckedChange={(v) => setForm(f => ({ ...f, allowedForMinors: v }))}
              />
              <div>
                <Label>מותר לקטינים (גיל 16–17)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">כבוי עבור קטגוריות כגון אלכוהל, לילה, אבטחה ועבודות המגובלות על-פי חוק עבודת הנוער</p>
              </div>
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

      {/* Create / Edit Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "עריכת קבוצה" : "קבוצה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <AppInput
              id="group-name"
              label="שם הקבוצה"
              required
              value={groupForm.name}
              onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))}
              placeholder="עבודות בית"
              dir="rtl"
            />
            {!editingGroup && (
              <AppInput
                id="group-slug"
                label="Slug (אותיות קטנות, קו תחתון)"
                value={groupForm.slug}
                onChange={(e) => setGroupForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                placeholder="home_services"
                dir="ltr"
              />
            )}
            <AppInput
              id="group-order"
              label="סדר תצוגה"
              type="number"
              value={groupForm.sortOrder}
              onChange={(e) => setGroupForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              min={0}
              dir="ltr"
            />
          </div>
          <DialogFooter className="gap-2">
            <AppButton variant="outline" onClick={() => setGroupDialogOpen(false)}>ביטול</AppButton>
            <AppButton onClick={handleGroupSubmit} disabled={createGroupMut.isPending || updateGroupMut.isPending}>
              {editingGroup ? "שמור" : "צור קבוצה"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirm */}
      <Dialog open={deleteGroupId !== null} onOpenChange={() => setDeleteGroupId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>מחיקת קבוצה</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">
            הקבוצה תימחק. קטגוריות השייכות אליה יועברו אוטומטית לקבוצה "כללי".
          </p>
          <DialogFooter className="gap-2">
            <AppButton variant="outline" onClick={() => setDeleteGroupId(null)}>ביטול</AppButton>
            <AppButton
              variant="destructive"
              disabled={deleteGroupMut.isPending}
              onClick={() => deleteGroupId && deleteGroupMut.mutate({ id: deleteGroupId })}
            >
              מחק קבוצה
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeFrom !== null} onOpenChange={() => setMergeFrom(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מזג קטגוריה</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            קטגוריה <strong>{mergeFrom?.name}</strong> תימחק.
            כל המשרות והעובדים שהיו בה יועברו לקטגוריה שתבחר.
          </p>
          <div className="space-y-2">
            <Label>מזג אל</Label>
            <Select value={mergeToSlug} onValueChange={setMergeToSlug}>
              <SelectTrigger dir="rtl">
                <SelectValue placeholder="בחר קטגוריית יעד..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {cats
                  .filter((c) => c.slug !== mergeFrom?.slug)
                  .map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <AppButton variant="outline" onClick={() => setMergeFrom(null)}>ביטול</AppButton>
            <AppButton
              variant="destructive"
              disabled={!mergeToSlug || mergeMut.isPending}
              onClick={() => mergeFrom && mergeMut.mutate({ fromSlug: mergeFrom.slug, toSlug: mergeToSlug })}
            >
              <Merge className="h-4 w-4 ml-1" />
              מזג ומחק
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

/** Legacy standalone page - kept for backward compatibility, redirects to admin panel */
export default function AdminCategories() {
  return <AdminCategoriesTab />;
}
