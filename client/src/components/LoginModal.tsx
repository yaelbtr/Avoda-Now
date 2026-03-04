import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, KeyRound, Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

/** Normalize Israeli phone for display — strips non-digits, formats as 05X-XXXXXXX */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return raw;
}

const RESEND_COOLDOWN_SEC = 60;

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const { refetch } = useAuth();

  const startResendTimer = () => {
    setResendCountdown(RESEND_COOLDOWN_SEC);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (step === "otp") setTimeout(() => codeInputRef.current?.focus(), 100);
  }, [step]);

  const sendOtp = trpc.auth.sendOtp.useMutation({
    onSuccess: (data) => {
      setNormalizedPhone(data.phone);
      setStep("otp");
      startResendTimer();
      toast.success("קוד אימות נשלח לטלפון שלך 📱");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      toast.success("התחברת בהצלחה! 🎉");
      refetch();
      onClose();
      resetForm();
    },
    onError: (e) => {
      toast.error(e.message);
      setCode("");
      setTimeout(() => codeInputRef.current?.focus(), 50);
    },
  });

  const resetForm = () => {
    setStep("phone");
    setPhone("");
    setNormalizedPhone("");
    setCode("");
    setName("");
    setResendCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSend = () => {
    const trimmed = phone.trim();
    if (!trimmed) return toast.error("הכנס מספר טלפון");
    sendOtp.mutate({ phone: trimmed });
  };

  const handleVerify = () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 4) return toast.error("הכנס את קוד האימות");
    verifyOtp.mutate({ phone: normalizedPhone || phone, code: trimmed, name: name || undefined });
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setCode("");
    sendOtp.mutate({ phone: phone.trim() });
  };

  const displayPhone = formatPhoneDisplay(phone);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-sm mx-auto" dir="rtl">
        <DialogHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {step === "phone" ? (
              <Phone className="h-6 w-6 text-primary" />
            ) : (
              <KeyRound className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {step === "phone" ? "כניסה / הרשמה" : "אימות קוד SMS"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            {step === "phone"
              ? "הכנס מספר טלפון ישראלי ונשלח לך קוד אימות"
              : `הכנס את הקוד שנשלח ל-${displayPhone}`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-4 pt-1">
            {/* Phone input */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5 text-right">מספר טלפון</label>
              <div className="relative">
                {/* Icon on the RIGHT side for RTL phone input */}
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="050-0000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pr-10 text-right"
                  dir="ltr"
                  style={{ textAlign: "left" }}
                  autoComplete="tel"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">לדוגמה: 050-1234567 או +972501234567</p>
            </div>

            {/* Optional name */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5 text-right">שם מלא (אופציונלי)</label>
              <Input
                placeholder="ישראל ישראלי"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="text-right"
              />
            </div>

            <Button
              className="w-full h-11 text-base font-semibold gap-2"
              onClick={handleSend}
              disabled={sendOtp.isPending}
            >
              {sendOtp.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />שולח קוד...</>
              ) : (
                <>שלח קוד</>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              בהתחברות אתה מסכים ל
              <a href="/terms" className="text-primary hover:underline mx-1">תנאי השימוש</a>
              ול
              <a href="/privacy" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* OTP code input */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5 text-center">קוד אימות</label>
              <Input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                placeholder="• • • • • •"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-3xl tracking-[0.5em] font-mono h-14 border-2 focus:border-primary"
                dir="ltr"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                הקוד תקף ל-10 דקות. מקסימום 3 ניסיונות.
              </p>
            </div>

            <Button
              className="w-full h-11 text-base font-semibold gap-2"
              onClick={handleVerify}
              disabled={verifyOtp.isPending || code.length < 4}
            >
              {verifyOtp.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />מאמת...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" />אמת קוד</>
              )}
            </Button>

            {/* Resend + back — RTL: "שנה מספר" on LEFT, "שלח שוב" on RIGHT */}
            <div className="flex items-center justify-between text-sm" dir="rtl">
              <button
                onClick={handleResend}
                disabled={resendCountdown > 0 || sendOtp.isPending}
                className={`flex items-center gap-1 transition-colors ${
                  resendCountdown > 0
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-primary hover:text-primary/80"
                }`}
              >
                {sendOtp.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {resendCountdown > 0 ? `שלח שוב (${resendCountdown}ש)` : "שלח שוב"}
              </button>

              <button
                onClick={() => { setStep("phone"); setCode(""); }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                שנה מספר
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
