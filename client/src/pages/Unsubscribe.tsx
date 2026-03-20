import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

export default function Unsubscribe() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  const unsubMutation = trpc.auth.unsubscribeEmail.useMutation({
    onSuccess: () => setConfirmed(true),
    onError: (err) => setError(err.message),
  });

  const handleConfirm = () => {
    if (!token) return;
    unsubMutation.mutate({ token });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-background px-4"
    >
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-md p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">AvodaNow</h1>
          <p className="text-xs text-muted-foreground">עבודה עכשיו</p>
        </div>

        {/* No token */}
        {!token && (
          <>
            <XCircle className="mx-auto mb-4 text-destructive" size={48} />
            <h2 className="text-xl font-semibold mb-2">קישור לא תקין</h2>
            <p className="text-muted-foreground text-sm mb-6">
              הקישור שבו השתמשת אינו תקין. אנא לחץ על הקישור שנשלח אליך במייל.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              חזרה לדף הבית
            </Button>
          </>
        )}

        {/* Confirmed */}
        {token && confirmed && (
          <>
            <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
            <h2 className="text-xl font-semibold mb-2">הוסרת בהצלחה</h2>
            <p className="text-muted-foreground text-sm mb-6">
              כתובת המייל שלך הוסרה מרשימת התפוצה שלנו. לא תקבל יותר מיילים
              שיווקיים מ-AvodaNow.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              שים לב: מיילים עסקיים חיוניים (כגון אישורי עסקה) עדיין יישלחו.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              חזרה לדף הבית
            </Button>
          </>
        )}

        {/* Error */}
        {token && error && !confirmed && (
          <>
            <XCircle className="mx-auto mb-4 text-destructive" size={48} />
            <h2 className="text-xl font-semibold mb-2">שגיאה</h2>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              חזרה לדף הבית
            </Button>
          </>
        )}

        {/* Confirm prompt */}
        {token && !confirmed && !error && (
          <>
            <Mail className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h2 className="text-xl font-semibold mb-2">הסרה מרשימת תפוצה</h2>
            <p className="text-muted-foreground text-sm mb-6">
              האם אתה בטוח שברצונך להסיר את עצמך מרשימת התפוצה של AvodaNow?
              <br />
              לא תקבל יותר עדכונים ומיילים שיווקיים.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConfirm}
                disabled={unsubMutation.isPending}
                className="w-full"
                variant="destructive"
              >
                {unsubMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  "כן, הסר אותי"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                disabled={unsubMutation.isPending}
                className="w-full"
              >
                ביטול
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
