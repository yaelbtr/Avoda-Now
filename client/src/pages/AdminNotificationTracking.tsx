/**
 * AdminNotificationTracking — per-job notification delivery tracking.
 * Shows all jobs that have notification logs, with aggregate stats and
 * a drill-down view of per-worker delivery status (SMS / Push).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppButton } from "@/components/ui";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Smartphone,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStats = {
  jobId: number;
  jobTitle: string | null;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  lastSentAt: Date | null;
};

type NotifLog = {
  id: number;
  batchId: number | null;
  workerId: number;
  workerName: string | null;
  workerPhone: string | null;
  channel: "sms" | "push";
  status: "sent" | "failed" | "skipped";
  errorMsg: string | null;
  phone: string | null;
  sentAt: Date;
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "sent" | "failed" | "skipped" }) {
  if (status === "sent")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
        <CheckCircle className="w-3 h-3" /> נשלח
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
        <XCircle className="w-3 h-3" /> נכשל
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5">
      <AlertCircle className="w-3 h-3" /> דולג
    </span>
  );
}

// ─── Channel icon ─────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: "sms" | "push" }) {
  if (channel === "sms")
    return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
  return <Smartphone className="w-3.5 h-3.5 text-purple-500" />;
}

// ─── Job row with expandable log table ───────────────────────────────────────

function JobNotificationRow({ job }: { job: JobStats }) {
  const [expanded, setExpanded] = useState(false);

  const logsQuery = trpc.admin.getNotificationLogsForJob.useQuery(
    { jobId: job.jobId },
    { enabled: expanded }
  );

  const total = job.totalSent + job.totalFailed + job.totalSkipped;
  const successRate = total > 0 ? Math.round((job.totalSent / total) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full text-right"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {job.jobTitle ?? `משרה #${job.jobId}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                משרה #{job.jobId}
                {job.lastSentAt && (
                  <> · נשלח לאחרונה: {new Date(job.lastSentAt).toLocaleString("he-IL")}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Aggregate badges */}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                <CheckCircle className="w-3 h-3" /> {job.totalSent}
              </span>
              {job.totalFailed > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                  <XCircle className="w-3 h-3" /> {job.totalFailed}
                </span>
              )}
              {job.totalSkipped > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5">
                  <AlertCircle className="w-3 h-3" /> {job.totalSkipped}
                </span>
              )}
              <Badge variant="outline" className="text-xs">
                {successRate}% הצלחה
              </Badge>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      {/* Expanded: per-worker log table */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {logsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : logsQuery.isError ? (
            <p className="text-sm text-destructive">שגיאה בטעינת הלוגים</p>
          ) : !logsQuery.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין רשומות</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right pb-2 pr-1 font-medium">עובד</th>
                    <th className="text-right pb-2 font-medium">טלפון</th>
                    <th className="text-right pb-2 font-medium">ערוץ</th>
                    <th className="text-right pb-2 font-medium">סטטוס</th>
                    <th className="text-right pb-2 font-medium">שעה</th>
                    <th className="text-right pb-2 font-medium">שגיאה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(logsQuery.data as NotifLog[]).map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-1 font-medium">
                        {log.workerName ?? `#${log.workerId}`}
                      </td>
                      <td className="py-2 text-muted-foreground" dir="ltr">
                        {log.workerPhone ?? log.phone ?? "—"}
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1">
                          <ChannelIcon channel={log.channel} />
                          <span className="text-xs">{log.channel === "sms" ? "SMS" : "Push"}</span>
                        </span>
                      </td>
                      <td className="py-2">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 text-xs text-red-600 max-w-[200px] truncate" title={log.errorMsg ?? ""}>
                        {log.errorMsg ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminNotificationTrackingTab() {
  const statsQuery = trpc.admin.getJobsWithNotificationStats.useQuery();

  const totalSent = statsQuery.data?.reduce((s, j) => s + Number(j.totalSent), 0) ?? 0;
  const totalFailed = statsQuery.data?.reduce((s, j) => s + Number(j.totalFailed), 0) ?? 0;
  const totalSkipped = statsQuery.data?.reduce((s, j) => s + Number(j.totalSkipped), 0) ?? 0;
  const jobCount = statsQuery.data?.length ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">מעקב שליחת הודעות</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            מעקב אחר שליחת SMS ו-Push לעובדים עבור כל משרה
          </p>
        </div>
        <AppButton
          variant="outline"
          size="sm"
          onClick={() => statsQuery.refetch()}
          disabled={statsQuery.isFetching}
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
          רענן
        </AppButton>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">משרות עם הודעות</p>
            <p className="text-2xl font-bold mt-0.5">{jobCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">נשלחו בהצלחה</p>
            <p className="text-2xl font-bold mt-0.5 text-green-600">{totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">נכשלו</p>
            <p className="text-2xl font-bold mt-0.5 text-red-600">{totalFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">דולגו</p>
            <p className="text-2xl font-bold mt-0.5 text-yellow-600">{totalSkipped}</p>
          </CardContent>
        </Card>
      </div>

      {/* Job list */}
      {statsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : statsQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-center text-destructive">
            שגיאה בטעינת הנתונים
          </CardContent>
        </Card>
      ) : !statsQuery.data?.length ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">אין עדיין לוגים של שליחת הודעות</p>
            <p className="text-xs text-muted-foreground mt-1">
              לוגים יופיעו כאן לאחר שתשלח הודעות לעובדים דרך הסקריפט
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(statsQuery.data as JobStats[]).map((job) => (
            <JobNotificationRow key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
