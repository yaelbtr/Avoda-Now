import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, KeyRound, Loader2 } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const { refetch } = useAuth();

  const sendOtp = trpc.auth.sendOtp.useMutation({
    onSuccess: (data) => {
      setStep("otp");
      toast.success("קוד נשלח לטלפון שלך");
      if (data.devCode) {
        toast.info(`קוד פיתוח: ${data.devCode}`, { duration: 30000 });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      toast.success("התחברת בהצלחה!");
      refetch();
      onClose();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setStep("phone");
    setPhone("");
    setCode("");
    setName("");
  };

  const handleSend = () => {
    if (!phone.trim()) return toast.error("הכנס מספר טלפון");
    sendOtp.mutate({ phone: phone.trim() });
  };

  const handleVerify = () => {
    if (!code.trim() || code.length !== 6) return toast.error("הכנס קוד בן 6 ספרות");
    verifyOtp.mutate({ phone, code, name: name || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-sm mx-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {step === "phone" ? "כניסה / הרשמה" : "אימות קוד"}
          </DialogTitle>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground text-center">
              הכנס מספר טלפון ונשלח לך קוד אימות
            </p>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="050-0000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pr-10 text-right"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
            </div>
            <Input
              placeholder="שם מלא (אופציונלי)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-right"
            />
            <Button
              className="w-full"
              onClick={handleSend}
              disabled={sendOtp.isPending}
            >
              {sendOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              שלח קוד
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground text-center">
              הכנס את הקוד שנשלח ל-{phone}
            </p>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="pr-10 text-center text-2xl tracking-widest"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={verifyOtp.isPending}
            >
              {verifyOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              אמת קוד
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setStep("phone")}
            >
              שנה מספר טלפון
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
