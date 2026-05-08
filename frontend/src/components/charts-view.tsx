import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { type Venue } from "../lib/types"

interface ChartsViewProps {
  venues: Venue[]
}

const PAGE_SIZE = 10

export function ChartsView({ venues }: ChartsViewProps) {
  const withDeletions = useMemo(
    () => venues.filter((v) => v.has_deletions),
    [venues],
  )
  const [barMode, setBarMode] = useState<"pct" | "abs">("pct")
  const [barPage, setBarPage] = useState(0)

  const barSorted = useMemo(
    () =>
      [...withDeletions].sort((a, b) =>
        barMode === "pct"
          ? b.percentage_deleted - a.percentage_deleted
          : b.deleted_estimate - a.deleted_estimate,
      ),
    [withDeletions, barMode],
  )

  const totalPages = Math.max(1, Math.ceil(barSorted.length / PAGE_SIZE))
  const currentPage = Math.min(barPage, totalPages - 1)
  const barData = barSorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((v) => ({
    name: v.name.length > 25 ? v.name.slice(0, 22) + "..." : v.name,
    value: barMode === "pct" ? v.percentage_deleted : v.deleted_estimate,
    fill: v.percentage_deleted >= 10 ? "#ef4444" : v.percentage_deleted >= 5 ? "#f59e0b" : "#22c55e",
  }))

  const gapData = useMemo(
    () =>
      [...withDeletions]
        .filter((v) => v.rating_gap > 0 && v.current_rating && v.real_score)
        .sort((a, b) => b.rating_gap - a.rating_gap)
        .slice(0, 15)
        .map((v) => ({
          name: v.name.length > 25 ? v.name.slice(0, 22) + "..." : v.name,
          real: v.real_score,
          gap: v.rating_gap,
        })),
    [withDeletions],
  )

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-8">
      {/* Top Offenders */}
      <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-3 text-base font-semibold text-gray-900">Top Offenders by % Deleted</h3>
        <div className="mb-4 flex gap-2">
          <MiniButton active={barMode === "pct"} onClick={() => { setBarMode("pct"); setBarPage(0) }}>
            % Deleted
          </MiniButton>
          <MiniButton active={barMode === "abs"} onClick={() => { setBarMode("abs"); setBarPage(0) }}>
            Absolute
          </MiniButton>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(250, barData.length * 30 + 40)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              label={{
                value: barMode === "pct" ? "% Deleted" : "Deleted Reviews (est.)",
                position: "insideBottom",
                offset: -5,
                fontSize: 12,
              }}
            />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(val) =>
                barMode === "pct" ? `${Number(val).toFixed(1)}%` : `~${Math.round(Number(val))} reviews`
              }
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              onClick={() => setBarPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              ◀ Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setBarPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

      {/* Rating Gap */}
      <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-3 text-base font-semibold text-gray-900">
          Rating Inflation: Current vs Real Score
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, gapData.length * 30 + 40)}>
          <BarChart data={gapData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 5.2]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(val, name) =>
                name === "real" ? `Real: ${Number(val).toFixed(2)}⭐` : `Inflated: +${Number(val).toFixed(2)}`
              }
            />
            <Legend />
            <Bar dataKey="real" stackId="a" fill="#3b82f6" name="Real Score" radius={[3, 0, 0, 3]} />
            <Bar dataKey="gap" stackId="a" fill="#ef4444" name="Inflated By" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MiniButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium ${
        active
          ? "bg-red-900 text-white"
          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}
