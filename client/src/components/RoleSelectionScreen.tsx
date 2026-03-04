import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Briefcase, HardHat, ArrowLeft } from "lucide-react";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [selected, setSelected] = useState<"worker" | "employer" | null>(null);
  const [loading, setLoading] = useState(false);

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: () => {
      if (selected) onSelected(selected);
    },
    onSettled: () => setLoading(false),
  });

  const handleConfirm = () => {
    if (!selected) return;
    setLoading(true);
    setModeMutation.mutate({ mode: selected });
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

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mb-8">
        {/* Worker card */}
        <button
          onClick={() => setSelected("worker")}
          className={`relative rounded-2xl border-2 p-6 text-right transition-all duration-200 hover:shadow-md focus:outline-none ${
            selected === "worker"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          {selected === "worker" && (
            <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
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
          onClick={() => setSelected("employer")}
          className={`relative rounded-2xl border-2 p-6 text-right transition-all duration-200 hover:shadow-md focus:outline-none ${
            selected === "employer"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          {selected === "employer" && (
            <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
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

      {/* Confirm button */}
      <Button
        size="lg"
        onClick={handleConfirm}
        disabled={!selected || loading}
        className="w-full max-w-md gap-2 text-base"
      >
        {loading ? (
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <ArrowLeft className="h-5 w-5" />
        )}
        {selected === "worker" ? "כניסה כמחפש עבודה" : selected === "employer" ? "כניסה כמעסיק" : "בחר תפקיד להמשך"}
      </Button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        ניתן לשנות את הבחירה בכל עת מהתפריט
      </p>
    </div>
  );
}
