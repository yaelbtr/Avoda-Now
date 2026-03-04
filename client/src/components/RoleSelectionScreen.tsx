import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat, Loader2 } from "lucide-react";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [loading, setLoading] = useState<"worker" | "employer" | null>(null);

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      onSelected(vars.mode);
    },
    onSettled: () => setLoading(null),
  });

  const handleSelect = (mode: "worker" | "employer") => {
    if (loading) return;
    setLoading(mode);
    setModeMutation.mutate({ mode });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 py-12" dir="rtl">
      {/* Logo / branding */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Briefcase className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">ברוך הבא ל-Job-Now</h1>
        <p className="text-muted-foreground mt-2 text-sm">בחר כיצד תרצה להשתמש בפלטפורמה</p>
      </div>

      {/* Role cards — click = immediate action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        {/* Worker card */}
        <button
          onClick={() => handleSelect("worker")}
          disabled={!!loading}
          className={`relative rounded-2xl border-2 p-6 text-right transition-all duration-200 hover:shadow-lg focus:outline-none active:scale-[0.98] ${
            loading === "worker"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-orange-400 hover:bg-orange-50"
          } disabled:opacity-70`}
        >
          {loading === "worker" ? (
            <div className="absolute top-3 left-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}
          <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
            <HardHat className="h-7 w-7 text-orange-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">אני מחפש עבודה</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            מצא עבודות זמניות ודחופות באזורך, סמן זמינות, וצור קשר עם מעסיקים ישירות
          </p>
          <div className="mt-4 flex flex-wrap gap-1">
            {["עבודות קרובות", "עבודות להיום", "סמן זמינות"].map((tag) => (
              <span key={tag} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Employer card */}
        <button
          onClick={() => handleSelect("employer")}
          disabled={!!loading}
          className={`relative rounded-2xl border-2 p-6 text-right transition-all duration-200 hover:shadow-lg focus:outline-none active:scale-[0.98] ${
            loading === "employer"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-blue-400 hover:bg-blue-50"
          } disabled:opacity-70`}
        >
          {loading === "employer" ? (
            <div className="absolute top-3 left-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}
          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
            <Briefcase className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">אני מחפש עובדים</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            פרסם משרות דחופות, מצא עובדים זמינים באזורך, וסגור משרה תוך דקות
          </p>
          <div className="mt-4 flex flex-wrap gap-1">
            {["פרסם משרה", "עובדים זמינים", "משרה דחופה"].map((tag) => (
              <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        ניתן לשנות את הבחירה בכל עת מהתפריט
      </p>
    </div>
  );
}
