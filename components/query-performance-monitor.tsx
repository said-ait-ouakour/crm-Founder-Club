"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Database, AlertTriangle, X } from "lucide-react";

interface QueryPerformanceData {
  queryTime: number;
  resultCount: number;
  isAdvisor: boolean;
  cacheHit: boolean;
  fallbackUsed: boolean;
  pathUsed: string; // "filter-first" | "batching" | "direct"
  timestamp: Date;
}

interface QueryPerformanceContextType {
  logPerformance: (data: Omit<QueryPerformanceData, 'timestamp'>) => void;
  performanceData: QueryPerformanceData[];
  isAdvisor: boolean;
}

const QueryPerformanceContext = createContext<QueryPerformanceContextType | null>(null);

interface QueryPerformanceProviderProps {
  isAdvisor: boolean;
  children: React.ReactNode;
}

export function QueryPerformanceProvider({ isAdvisor, children }: QueryPerformanceProviderProps) {
  const [performanceData, setPerformanceData] = useState<QueryPerformanceData[]>([]);

  const logPerformance = (data: Omit<QueryPerformanceData, 'timestamp'>) => {
    const newData: QueryPerformanceData = {
      ...data,
      timestamp: new Date()
    };
    
    setPerformanceData(prev => [newData, ...prev.slice(0, 9)]); // Keep last 10 queries
  };

  return (
    <QueryPerformanceContext.Provider value={{ logPerformance, performanceData, isAdvisor }}>
      {children}
    </QueryPerformanceContext.Provider>
  );
}

interface QueryPerformanceMonitorProps {
  onRefresh?: () => void;
}

export function QueryPerformanceMonitor({ onRefresh }: QueryPerformanceMonitorProps) {
  const context = useContext(QueryPerformanceContext);
  const [isVisible, setIsVisible] = useState(false);

  // If no context, don't render (optional feature)
  if (!context) return null;

  const { performanceData, isAdvisor } = context;

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Show monitor if query is slow or fallback is used
  useEffect(() => {
    if (performanceData.length > 0) {
      const latestQuery = performanceData[0];
      if (latestQuery.queryTime > 3000 || latestQuery.fallbackUsed) {
        setIsVisible(true);
      }
    }
  }, [performanceData]);

  const avgQueryTime = performanceData.length > 0 
    ? performanceData.reduce((sum, data) => sum + data.queryTime, 0) / performanceData.length 
    : 0;

  const getPerformanceStatus = (queryTime: number) => {
    if (queryTime < 1000) return { status: "excellent", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
    if (queryTime < 3000) return { status: "good", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
    if (queryTime < 5000) return { status: "slow", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
    return { status: "very-slow", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
  };

  const getPathColor = (path: string) => {
    switch (path) {
      case "filter-first": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "batching": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "direct": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (performanceData.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {/* Toggle button when hidden */}
      {!isVisible && performanceData.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
          title="Show Query Performance"
        >
          <Database className="h-4 w-4" />
        </Button>
      )}
      
      {/* Full monitor when visible */}
      {isVisible && (
        <Card className="shadow-lg animate-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Query Performance
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {/* Current Performance */}
              {performanceData.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Last Query:</span>
                    </div>
                    <Badge 
                      className={getPerformanceStatus(performanceData[0].queryTime).color}
                    >
                      {performanceData[0].queryTime.toFixed(0)}ms
                    </Badge>
                  </div>

                  {/* Path Used */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Path:</span>
                    <Badge className={getPathColor(performanceData[0].pathUsed)}>
                      {performanceData[0].pathUsed}
                    </Badge>
                  </div>

                  {/* Cache Status */}
                  {performanceData[0].cacheHit && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <span>✓ Cache Hit</span>
                    </div>
                  )}
                </>
              )}

              {/* Average Performance */}
              {avgQueryTime > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">Average:</span>
                  <Badge 
                    className={getPerformanceStatus(avgQueryTime).color}
                  >
                    {avgQueryTime.toFixed(0)}ms
                  </Badge>
                </div>
              )}

              {/* Advisor Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Mode:</span>
                <Badge variant={isAdvisor ? "secondary" : "default"}>
                  {isAdvisor ? "Advisor" : "Manager"}
                </Badge>
              </div>

              {/* Warnings */}
              {performanceData.some(data => data.fallbackUsed) && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Using fallback queries</span>
                </div>
              )}

              {/* Recent Queries */}
              {performanceData.length > 1 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium">Recent Queries:</div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {performanceData.slice(1, 4).map((data, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span>{data.resultCount} results</span>
                        <Badge 
                          variant="outline" 
                          className={getPerformanceStatus(data.queryTime).color}
                        >
                          {data.queryTime.toFixed(0)}ms
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="w-full mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook to use the performance monitor
export function useQueryPerformanceMonitor() {
  const context = useContext(QueryPerformanceContext);
  if (!context) {
    // Return a no-op implementation if no provider
    return {
      logPerformance: () => {},
      performanceData: [],
      isAdvisor: false
    };
  }
  return context;
}

