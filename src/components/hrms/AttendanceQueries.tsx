'use client';

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — AttendanceQueries (HRMS side)
// ════════════════════════════════════════════════════════════════════════
// HR uses this page to view attendance queries raised by ERP employees
// and respond to them. The page calls ERP's external API via a server-side
// proxy at /api/erp-bridge/attendance-queries (which adds the API key
// header so the browser never sees the secret).
//
// SAFETY: HR can ONLY respond to queries. They cannot modify attendance
// data — that requires direct HRMS admin access (separate flow).
// The response is stored in ERP's AttendanceQuery table.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHRMSStore } from '@/lib/store';
import { toast } from 'sonner';
import { MessageSquareText, Send, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AttendanceQuery {
  id: string;
  userId: string;
  hrmsEmployeeId: string | null;
  queryMonth: number;
  queryYear: number;
  queryText: string;
  status: string;
  hrReply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    phone: string | null;
  };
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function AttendanceQueries() {
  const { adminName } = useHRMSStore();
  const [queries, setQueries] = useState<AttendanceQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESPONDED' | 'CLOSED'>('OPEN');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/erp-bridge/attendance-queries?status=${filter === 'ALL' ? '' : filter}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch queries');
      setQueries(Array.isArray(data.queries) ? data.queries : []);
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
    // Auto-refresh every 30 seconds so HR sees new queries without manual refresh
    const t = setInterval(fetchQueries, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const submitResponse = async (queryId: string) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/erp-bridge/attendance-queries/${queryId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hrReply: replyText.trim(),
          repliedBy: adminName || 'HR',
          status: 'RESPONDED',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to respond');
      toast.success('Reply sent to employee.');
      setReplyText('');
      setRespondingTo(null);
      fetchQueries();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeQuery = async (queryId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/erp-bridge/attendance-queries/${queryId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hrReply: 'Query closed by HR.',
          repliedBy: adminName || 'HR',
          status: 'CLOSED',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to close');
      }
      toast.success('Query closed.');
      fetchQueries();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close query.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filter === 'ALL' ? queries : queries.filter(q => q.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareText className="w-6 h-6 text-amber-500" />
            ERP Attendance Queries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Queries raised by ERP employees about their HRMS attendance. Respond directly — replies are stored in ERP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="RESPONDED">Responded</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchQueries} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm flex-1 min-w-0">
              <div className="font-semibold text-red-500">Cannot reach ERP bridge</div>
              <div className="text-muted-foreground mt-1">{error}</div>
              <div className="text-muted-foreground mt-3 text-xs leading-relaxed">
                To enable this page, the HRMS admin needs to set <strong>two environment variables</strong> on the HRMS Vercel project:
              </div>
              <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                <li>
                  <code className="px-1 py-0.5 rounded bg-muted">ERP_BRIDGE_URL</code> — base URL of the ERP deployment
                  (e.g. <code className="px-1 py-0.5 rounded bg-muted">https://erp-ea.vercel.app</code>)
                </li>
                <li>
                  <code className="px-1 py-0.5 rounded bg-muted">ERP_BRIDGE_API_KEY</code> — shared secret that must
                  <strong> exactly match</strong> the <code className="px-1 py-0.5 rounded bg-muted">ERP_BRIDGE_API_KEY</code> set on the ERP Vercel project.
                </li>
              </ul>
              <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
                <strong>Steps:</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                  <li>Open Vercel → HRMS project → Settings → Environment Variables</li>
                  <li>Add the two variables above (Production + Preview environments)</li>
                  <li>Trigger a redeploy (Redeploy button on the Deployments tab)</li>
                  <li>Come back to this page — queries from ERP employees will appear here</li>
                </ol>
              </div>
              <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
                <strong className="text-foreground">Also required on the ERP side:</strong> the ERP Vercel project must set
                <code className="mx-1 px-1 py-0.5 rounded bg-muted">HRMS_BRIDGE_URL</code> (this HRMS deployment URL) and
                <code className="mx-1 px-1 py-0.5 rounded bg-muted">HRMS_BRIDGE_API_KEY</code> (same value as
                <code className="mx-1 px-1 py-0.5 rounded bg-muted">HRMS_BRIDGE_API_KEY</code> on HRMS) — otherwise ERP employees
                cannot see their attendance or raise queries.
              </div>
              {error.includes('401') && (
                <div className="text-xs mt-3 pt-3 border-t border-border/60 bg-amber-500/10 -mx-3 px-3 py-2 rounded-md">
                  <strong className="text-amber-700 dark:text-amber-400">⚠ HTTP 401 specific guidance:</strong>{' '}
                  A 401 means HRMS reached ERP successfully, but ERP rejected the shared secret. If you have
                  <em> already </em> set <code className="px-1 py-0.5 rounded bg-muted">ERP_BRIDGE_API_KEY</code> on
                  <em> both </em> Vercel projects with the same value, the most likely cause is that
                  <strong> at least one of the projects has not been redeployed since the env var was added</strong>.
                  Vercel only applies new env vars on the <strong>next</strong> deployment — running deployments
                  keep using the old environment. Fix: trigger a redeploy on <strong>both</strong> the ERP and HRMS
                  Vercel projects (Deployments tab → ⋮ → Redeploy), then come back to this page.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <div className="text-lg font-semibold">No {filter !== 'ALL' ? filter.toLowerCase() : ''} queries</div>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'OPEN'
                ? 'All caught up. New queries from ERP will appear here automatically.'
                : `No ${filter.toLowerCase()} queries found. Try a different filter.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Query cards */}
      <div className="grid gap-4">
        {filtered.map((q) => {
          const isResponding = respondingTo === q.id;
          const isOpen = q.status === 'OPEN';
          return (
            <Card key={q.id} className={isOpen ? 'border-amber-500/40' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{q.user.name}</span>
                      <Badge
                        variant={q.status === 'OPEN' ? 'default' : q.status === 'RESPONDED' ? 'secondary' : 'outline'}
                        className={q.status === 'OPEN' ? 'bg-amber-500 text-black hover:bg-amber-500' : ''}
                      >
                        {q.status}
                      </Badge>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>📧 {q.user.email || '—'}</span>
                      <span>🏢 {q.user.department || '—'}</span>
                      <span>📱 {q.user.phone || '—'}</span>
                      <span>🕒 {new Date(q.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">For</div>
                    <div className="text-sm font-semibold">
                      {months[q.queryMonth - 1]} {q.queryYear}
                    </div>
                    {q.hrmsEmployeeId && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        HRMS ID: {q.hrmsEmployeeId}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Query text */}
                <div className="text-sm bg-muted/50 rounded-md p-3 border-l-2 border-amber-500/60">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                    Employee's Query
                  </div>
                  {q.queryText}
                </div>

                {/* Existing reply */}
                {q.hrReply && (
                  <div className="text-sm bg-green-500/5 rounded-md p-3 border-l-2 border-green-500/60">
                    <div className="text-[10px] uppercase tracking-wide text-green-600 font-semibold mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      HR Reply · {q.repliedBy || 'HR'} · {q.repliedAt ? new Date(q.repliedAt).toLocaleString('en-IN') : ''}
                    </div>
                    {q.hrReply}
                  </div>
                )}

                {/* Respond form */}
                {isResponding ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your response to the employee…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRespondingTo(null); setReplyText(''); }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitResponse(q.id)}
                        disabled={submitting || !replyText.trim()}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        {submitting ? 'Sending…' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    {q.status !== 'CLOSED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeQuery(q.id)}
                        disabled={submitting}
                      >
                        Close
                      </Button>
                    )}
                    {isOpen && (
                      <Button
                        size="sm"
                        onClick={() => { setRespondingTo(q.id); setReplyText(q.hrReply || ''); }}
                      >
                        <MessageSquareText className="w-3.5 h-3.5 mr-1" />
                        {q.hrReply ? 'Update Reply' : 'Respond'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
