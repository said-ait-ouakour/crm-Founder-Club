"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface Log {
  id: string;
  user_id: number | null;
  endpoint: string;
  action: string;
  created_at: string;
  user?: {
    fullName: string;
    email: string;
  };
}

export default function LogsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace("/unauthorized");
      return;
    }
  }, [isAdmin, authLoading, router]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchTerm.trim() !== "") {
        query = query.or(`endpoint.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      if (actionFilter !== "all") {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      if (endpointFilter !== "all") {
        query = query.ilike("endpoint", `%${endpointFilter}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: logsData, error, count } = await query;

      if (error) {
        console.error("Error fetching logs:", error);
        if (error.code === "PGRST116" || error.message?.includes("404") || error.message?.includes("not found")) {
          setError("The logs table doesn't exist yet. Please create it in your Supabase database.");
        } else {
          setError(`Error loading logs: ${error.message || "Unknown error"}`);
        }
        setLogs([]);
        setTotalCount(0);
        return;
      }

      setError(null);

      const userIds = [...new Set((logsData || []).filter((log) => log.user_id).map((log) => log.user_id))];

      let usersMap: Record<number, { fullName: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, fullname, email")
          .in("id", userIds);

        if (usersData) {
          usersMap = usersData.reduce(
            (acc, user) => {
              acc[user.id] = { fullName: user.fullname ?? "", email: user.email ?? "" };
              return acc;
            },
            {} as Record<number, { fullName: string; email: string }>
          );
        }
      }

      const logsWithUsers = (logsData || []).map((log) => ({
        ...log,
        user: log.user_id ? usersMap[log.user_id] : undefined,
      }));

      setLogs(logsWithUsers);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !authLoading) fetchLogs();
  }, [page, searchTerm, actionFilter, endpointFilter, isAdmin, authLoading]);

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const uniqueEndpoints = Array.from(new Set(logs.map((log) => log.endpoint))).sort();

  const handleRefresh = () => {
    setSelectedLogs(new Set());
    fetchLogs();
  };

  const toggleSelectLog = (logId: string) => {
    setSelectedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) newSet.delete(logId);
      else newSet.add(logId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === logs.length) setSelectedLogs(new Set());
    else setSelectedLogs(new Set(logs.map((log) => log.id)));
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      toast({
        title: "No logs selected",
        description: "Please select logs to delete",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedLogs.size} log(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/logs/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedLogs) }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete logs");
      }

      toast({
        title: "Success",
        description: `Deleted ${selectedLogs.size} log(s) successfully`,
      });

      setSelectedLogs(new Set());
      fetchLogs();
    } catch (err) {
      console.error("Error deleting logs:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete logs",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-green-100 text-green-800";
    if (action.includes("UPDATE")) return "bg-blue-100 text-blue-800";
    if (action.includes("DELETE")) return "bg-red-100 text-red-800";
    if (action.includes("GET") || action.includes("LIST")) return "bg-gray-100 text-gray-800";
    return "bg-purple-100 text-purple-800";
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-2">View all user actions performed in the system</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter logs by action, endpoint, or search term</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={endpointFilter}
                onValueChange={(value) => {
                  setEndpointFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by endpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Endpoints</SelectItem>
                  {uniqueEndpoints.slice(0, 20).map((endpoint) => (
                    <SelectItem key={endpoint} value={endpoint}>
                      {endpoint.length > 40 ? `${endpoint.substring(0, 40)}...` : endpoint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Logs</CardTitle>
                <CardDescription>
                  Showing {logs.length} of {totalCount} logs
                  {selectedLogs.size > 0 && (
                    <span className="ml-2 text-blue-600 font-semibold">({selectedLogs.size} selected)</span>
                  )}
                </CardDescription>
              </div>
              {selectedLogs.size > 0 && (
                <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : `Delete ${selectedLogs.size} log(s)`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading logs...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-red-800 font-semibold mb-2">Error Loading Logs</p>
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  {error.includes("doesn't exist") && (
                    <div className="text-left bg-white p-4 rounded border border-red-200 mt-4">
                      <p className="text-sm font-semibold mb-2">To create the logs table, run this SQL in Supabase:</p>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {`CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  action TEXT NOT NULL,
  CONSTRAINT logs_pkey PRIMARY KEY (id),
  CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id)
) TABLESPACE pg_default;`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No logs found</p>
                <p className="text-sm mt-2">Try adjusting your filters or perform some actions to generate logs</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={logs.length > 0 && selectedLogs.size === logs.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Endpoint</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLogs.has(log.id)}
                              onCheckedChange={() => toggleSelectLog(log.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            <br />
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            {log.user ? (
                              <div>
                                <div className="font-medium">{log.user.fullName}</div>
                                <div className="text-sm text-gray-500">{log.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unknown User</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-md truncate" title={log.endpoint}>
                            {log.endpoint}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
