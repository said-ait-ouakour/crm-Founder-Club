"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"

interface StageKPI {
  stage: number
  lead_count: number
  conversion_rate_pct: number | null
  is_bottleneck: boolean
}

interface PipelineStats {
  total_leads: number
  stages: StageKPI[]
}

const STAGE_NAMES = [
  "New Lead",
  "Introduced",
  "Arranging Demo",
  "Demo Held",
  "Proposal Form",
  "Letter Sent",
  "Terms Agreed",
  "Signed",
  "Handover",
]

const STAGE_COLORS = [
  "#94a3b8", // 0 gray
  "#60a5fa", // 1 blue
  "#fbbf24", // 2 yellow
  "#f97316", // 3 orange
  "#a78bfa", // 4 purple
  "#818cf8", // 5 indigo
  "#f472b6", // 6 pink
  "#34d399", // 7 green
  "#10b981", // 8 emerald
]

export function PipelineKpiSection() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/pipeline-stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (e) {
        console.error("Failed to load pipeline KPIs", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats || !stats.stages) return null

  const bottlenecks = stats.stages.filter((s) => s.is_bottleneck)
  const chartData = stats.stages.map((s) => ({
    name: `S${s.stage}`,
    fullName: STAGE_NAMES[s.stage],
    count: Number(s.lead_count),
    isBottleneck: s.is_bottleneck,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Omniflow Pipeline KPIs
        </h2>
        <span className="text-sm text-muted-foreground">
          {stats.total_leads} total leads tracked
        </span>
      </div>

      {/* Stage count cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {stats.stages.map((s) => (
          <Card
            key={s.stage}
            className={`text-center ${s.is_bottleneck ? "border-red-300 bg-red-50 dark:bg-red-950" : ""}`}
          >
            <CardContent className="py-3 px-2">
              <div className="text-2xl font-bold" style={{ color: STAGE_COLORS[s.stage] }}>
                {s.lead_count}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {STAGE_NAMES[s.stage]}
              </div>
              {s.is_bottleneck && (
                <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution bar chart + conversion rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-900 border rounded shadow px-3 py-2 text-xs">
                        <p className="font-semibold">{d.fullName}</p>
                        <p>{d.count} leads</p>
                        {d.isBottleneck && (
                          <p className="text-red-500 flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" /> Bottleneck
                          </p>
                        )}
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isBottleneck ? "#ef4444" : STAGE_COLORS[index]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.stages
                .filter((s) => s.stage < 8 && s.conversion_rate_pct !== null)
                .map((s) => {
                  const rate = s.conversion_rate_pct ?? 0
                  const isLow = rate < 30
                  return (
                    <div key={s.stage} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">
                        {STAGE_NAMES[s.stage]} →
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${isLow ? "bg-red-400" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-10 text-right ${isLow ? "text-red-500" : "text-blue-600"}`}>
                        {rate}%
                      </span>
                      {isLow ? (
                        <TrendingDown className="h-3 w-3 text-red-400 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck alert */}
      {bottlenecks.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Pipeline Bottleneck{bottlenecks.length > 1 ? "s" : ""} Detected
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {bottlenecks.map((b) => (
                    <Badge key={b.stage} variant="outline" className="text-xs border-red-300 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Stage {b.stage} · {STAGE_NAMES[b.stage]} — {b.lead_count} leads, {b.conversion_rate_pct}% conversion
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
