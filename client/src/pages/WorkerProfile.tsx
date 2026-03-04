import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES } from "@shared/categories";
import { User, MapPin, Briefcase, Save, Loader2, ArrowRight } from "lucide-react";

const ALL_CATEGORIES = [
  ...JOB_CATEGORIES,
  ...SPECIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon })),
];

export default function WorkerProfile() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("הפרופיל עודכן בהצלחה");
      profileQuery.refetch();
    },
    onError: () => toast.error("שגיאה בשמירת הפרופיל"),
  });

  const [name, setName] = useState("");
  const [preferredCity, setPreferredCity] = useState("");
  const [workerBio, setWorkerBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Populate form from server data
  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name ?? "");
      setPreferredCity(profileQuery.data.preferredCity ?? "");
      setWorkerBio(profileQuery.data.workerBio ?? "");
      setSelectedCategories(profileQuery.data.preferredCategories ?? []);
    }
  }, [profileQuery.data]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">יש להתחבר כדי לצפות בפרופיל</p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          חזרה לדף הבית
        </Button>
      </div>
    );
  }

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim() || undefined,
      preferredCategories: selectedCategories,
      preferredCity: preferredCity.trim() || null,
      workerBio: workerBio.trim() || null,
    });
  };

  const isLoading = profileQuery.isLoading;

  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">הפרופיל שלי</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              פרטים אישיים
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">שם</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="השם שלך"
                  className="text-right"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  טלפון
                </label>
                <Input
                  value={profileQuery.data?.phone ?? ""}
                  disabled
                  className="text-right bg-muted text-muted-foreground"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  מספר הטלפון אינו ניתן לשינוי
                </p>
              </div>
            </div>
          </div>

          {/* Preferred area */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              אזור מועדף
            </h2>
            <Input
              value={preferredCity}
              onChange={(e) => setPreferredCity(e.target.value)}
              placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
              className="text-right"
            />
            <p className="text-xs text-muted-foreground mt-2">
              מעסיקים יוכלו לסנן עובדים לפי אזור זה
            </p>
          </div>

          {/* Preferred categories */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              תחומי עיסוק מועדפים
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              בחר את הקטגוריות שאתה מוכן לעבוד בהן — מעסיקים יראו אותן בפרופיל שלך
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-xs text-primary mt-3 font-medium">
                {selectedCategories.length} קטגוריות נבחרו
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-2">אודות</h2>
            <Textarea
              value={workerBio}
              onChange={(e) => setWorkerBio(e.target.value)}
              placeholder="ספר קצת על עצמך — ניסיון, כישורים, זמינות..."
              className="text-right resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-left">
              {workerBio.length}/500
            </p>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full gap-2 py-6 text-base font-bold"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            שמור פרופיל
          </Button>
        </div>
      )}
    </div>
  );
}
