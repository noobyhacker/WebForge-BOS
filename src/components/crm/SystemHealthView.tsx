import { useAuth } from "@/contexts/AuthContext";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListOrdered,
  Server,
  XCircle,
} from "lucide-react";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ok":
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "pending":
    case "processing":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ok":
    case "completed":
      return "default";
    case "error":
    case "failed":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "outline";
  }
}

export function SystemHealthView() {
  const { isAdmin } = useAuth();
  const { healthLogs, jobQueue, isLoading } = useSystemHealth();

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const pendingJobs = jobQueue.filter((j) => j.status === "pending");
  const failedJobs = jobQueue.filter((j) => j.status === "failed");
  const processingJobs = jobQueue.filter((j) => j.status === "processing");
  const errorLogs = healthLogs.filter((l) => l.status === "error");
  const recentOk = healthLogs.filter((l) => l.status === "ok");

  const overallStatus =
    errorLogs.length > 0 ? "error" : failedJobs.length > 0 ? "warning" : "ok";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Health</h1>
        <p className="text-sm text-muted-foreground">
          Monitor system status, job queue, and error logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Status
            </CardTitle>
            <StatusIcon status={overallStatus} />
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant(overallStatus)} className="text-lg capitalize">
              {overallStatus}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queue Depth
            </CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {processingJobs.length} processing · {failedJobs.length} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Logs
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorLogs.length}</div>
            <p className="text-xs text-muted-foreground">of {healthLogs.length} total logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Healthy Checks
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOk.length}</div>
            <p className="text-xs text-muted-foreground">of {healthLogs.length} total logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : jobQueue.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No jobs in queue.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobQueue.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={job.status} />
                        <Badge variant={statusVariant(job.status)} className="capitalize">
                          {job.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{job.job_type}</TableCell>
                    <TableCell>{job.priority}</TableCell>
                    <TableCell>
                      {job.attempts}/{job.max_attempts}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(job.scheduled_for), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                      {job.last_error || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Health Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Health Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : healthLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No health logs recorded.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={log.status} />
                        <Badge variant={statusVariant(log.status)} className="capitalize">
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
                    <TableCell className="text-sm">{log.source}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {log.message || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
