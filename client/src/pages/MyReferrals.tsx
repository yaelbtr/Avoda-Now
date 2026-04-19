import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { Copy, Check, Users, Share2, Gift } from "lucide-react";
import { toast } from "sonner";
import BrandLoader from "@/components/BrandLoader";
import { getLoginUrl } from "@/const";

const SITE_URL = "https://avodanow.co.il";

export default function MyReferrals() {
  const { user, isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = trpc.referral.myStats.useQuery(undefined, {
    ...authQuery(),
  });

  const referralLink = user ? `${SITE_URL}/?ref=${user.id}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("הקישור הועתק!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("לא ניתן להעתיק");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "הצטרף ל-AvodaNow",
        text: "מצא עבודה זמנית קרובה אליך!",
        url: referralLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-50 border border-amber-200">
          <Gift className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-lg font-semibold text-gray-900">יש להתחבר כדי לראות את ההפניות שלך</p>
        <a
          href={getLoginUrl("/my-referrals")}
          className="px-6 py-2.5 rounded-xl font-semibold text-white"
          style={{ background: "oklch(0.55 0.14 84)" }}
        >
          התחבר
        </a>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <BrandLoader size="lg" label="טוען נתוני הפניות..." />
      </div>
    );
  }

  const count = data?.count ?? 0;
  const referrals = data?.referrals ?? [];

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.01 84)" }} dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">הפניות שלי</h1>
          <p className="text-gray-500 text-sm">שתף את הקישור שלך וקבל קרדיט על כל הרשמה</p>
        </div>

        {/* Stats card */}
        <div
          className="rounded-2xl p-6 text-center space-y-2"
          style={{
            background: "white",
            border: "1px solid oklch(0.87 0.04 84)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <Users className="h-5 w-5" />
            <span className="text-4xl font-bold text-gray-900">{count}</span>
          </div>
          <p className="text-gray-500 text-sm">
            {count === 0
              ? "עדיין לא הפנית אף אחד"
              : count === 1
              ? "אדם אחד נרשם דרך הקישור שלך"
              : `${count} אנשים נרשמו דרך הקישור שלך`}
          </p>
        </div>

        {/* Referral link card */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background: "white",
            border: "1px solid oklch(0.87 0.04 84)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <p className="font-semibold text-gray-800 text-sm">הקישור האישי שלך</p>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "oklch(0.97 0.01 84)", border: "1px solid oklch(0.87 0.04 84)" }}
          >
            <span className="flex-1 text-sm text-gray-600 truncate font-mono" dir="ltr">
              {referralLink}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-lg transition-colors"
              style={{ color: copied ? "#16a34a" : "oklch(0.55 0.14 84)" }}
              title="העתק קישור"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              style={{
                background: "oklch(0.97 0.01 84)",
                border: "1px solid oklch(0.87 0.04 84)",
                color: "oklch(0.45 0.12 84)",
              }}
            >
              <Copy className="h-4 w-4" />
              העתק
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
              style={{ background: "oklch(0.55 0.14 84)" }}
            >
              <Share2 className="h-4 w-4" />
              שתף
            </button>
          </div>
        </div>

        {/* Referred users list */}
        {referrals.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "white",
              border: "1px solid oklch(0.87 0.04 84)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.93 0.02 84)" }}>
              <p className="font-semibold text-gray-800">מי נרשם דרכך</p>
            </div>
            <ul className="divide-y" style={{ borderColor: "oklch(0.93 0.02 84)" }}>
              {referrals.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: "oklch(0.65 0.12 84)" }}
                    >
                      {(r.name ?? "משתמש").charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-800">{r.name ?? "משתמש"}</span>
                      {r.userMode && (
                        <span className="block text-xs text-gray-400">
                          {r.userMode === "worker" ? "עובד" : "מעסיק"}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state for referrals list */}
        {referrals.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center space-y-3"
            style={{
              background: "white",
              border: "1px solid oklch(0.87 0.04 84)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-amber-50">
              <Gift className="h-6 w-6 text-amber-400" />
            </div>
            <p className="font-semibold text-gray-700">שתף את הקישור שלך!</p>
            <p className="text-sm text-gray-400">
              כשמישהו נרשם דרך הקישור שלך, הוא יופיע כאן
            </p>
          </div>
        )}

        {/* How it works */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "oklch(0.97 0.02 84)",
            border: "1px solid oklch(0.87 0.04 84)",
          }}
        >
          <p className="font-semibold text-gray-800 text-sm">איך זה עובד?</p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ background: "oklch(0.55 0.14 84)" }}>1</span>
              <span>שתף את הקישור האישי שלך עם חברים</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ background: "oklch(0.55 0.14 84)" }}>2</span>
              <span>הם נרשמים לאתר דרך הקישור שלך</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ background: "oklch(0.55 0.14 84)" }}>3</span>
              <span>ההפניה נרשמת לחשבונך — בקרוב יהיו פרסים!</span>
            </li>
          </ol>
        </div>

      </div>
    </div>
  );
}
