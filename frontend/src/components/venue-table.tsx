import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "./table"
import { Badge, type BadgeVariant } from "./badge"
import { type Venue, type SortColumn, type SortDirection } from "../lib/types"
import { sortVenues, getSeverityLevel } from "../lib/venue-utils"

interface VenueTableProps {
  venues: Venue[]
}

const SEVERITY_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  high: { label: "🔴 High", variant: "error" },
  med: { label: "🟡 Med", variant: "warning" },
  low: { label: "🟢 Low", variant: "success" },
  none: { label: "", variant: "neutral" },
}

const SEVERITY_ROW_CLASS: Record<string, string> = {
  high: "bg-red-50 hover:bg-red-100",
  med: "bg-amber-50 hover:bg-amber-100",
  low: "hover:bg-gray-50",
  none: "hover:bg-gray-50",
}

const SEVERITY_CARD_CLASS: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  med: "border-amber-200 bg-amber-50",
  low: "border-gray-200 bg-white",
  none: "border-gray-200 bg-white",
}

interface ColumnDef {
  key: SortColumn
  label: string
  align?: "right"
  hideOnMobile?: boolean
}

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Venue" },
  { key: "city", label: "City", hideOnMobile: true },
  { key: "venue_type", label: "Type", hideOnMobile: true },
  { key: "total_reviews", label: "Reviews", align: "right" },
  { key: "deleted_estimate", label: "Deleted", align: "right" },
  { key: "percentage_deleted", label: "% Del", align: "right" },
  { key: "current_rating", label: "Rating", align: "right" },
  { key: "real_score", label: "Real", align: "right", hideOnMobile: true },
  { key: "rating_gap", label: "Gap", align: "right", hideOnMobile: true },
]

const SORT_OPTIONS: { key: SortColumn; label: string }[] = [
  { key: "percentage_deleted", label: "% Deleted" },
  { key: "deleted_estimate", label: "Deleted Count" },
  { key: "name", label: "Name" },
  { key: "current_rating", label: "Rating" },
  { key: "rating_gap", label: "Gap" },
]

export function VenueTable({ venues }: VenueTableProps) {
  const [sortCol, setSortCol] = useState<SortColumn>("percentage_deleted")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir(col === "name" || col === "city" ? "asc" : "desc")
    }
  }

  const sorted = sortVenues(venues, sortCol, sortDir)
  const display = sorted.slice(0, 300)

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <p className="mb-2 text-sm text-gray-500">Showing {venues.length} venues</p>

      {/* Mobile: card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Sort by:</label>
          <select
            value={sortCol}
            onChange={(e) => handleSort(e.target.value as SortColumn)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
        {display.map((v) => (
          <VenueCard key={v.url} venue={v} />
        ))}
      </div>

      {/* Desktop: table layout */}
      <TableRoot className="hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHeaderCell
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none hover:text-gray-900 ${
                    col.align === "right" ? "text-right" : ""
                  } ${col.hideOnMobile ? "hidden lg:table-cell" : ""}`}
                >
                  {col.label}
                  {sortCol === col.key ? (sortDir === "asc" ? " ▴" : " ▾") : " ▿"}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {display.map((v) => {
              const severity = getSeverityLevel(v.percentage_deleted)
              const badge = SEVERITY_BADGE[severity]
              return (
                <TableRow key={v.url} className={SEVERITY_ROW_CLASS[severity]}>
                  <TableCell className="font-medium">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-900 hover:underline"
                      title={v.review_notice || undefined}
                    >
                      {v.name}
                    </a>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{v.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">{v.venue_type}</TableCell>
                  <TableCell className="text-right">{v.total_reviews.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {v.deleted_estimate > 0 ? `~${Math.round(v.deleted_estimate)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.percentage_deleted > 0 ? `${v.percentage_deleted.toFixed(1)}%` : "—"}
                    {badge.label && (
                      <Badge variant={badge.variant} className="ml-1.5">
                        {badge.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.current_rating ? `⭐ ${v.current_rating}` : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {v.real_score ? `⭐ ${v.real_score.toFixed(1)}` : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell">
                    {v.rating_gap > 0 ? `-${v.rating_gap.toFixed(2)}` : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableRoot>
    </div>
  )
}

function VenueCard({ venue: v }: { venue: Venue }) {
  const severity = getSeverityLevel(v.percentage_deleted)
  const badge = SEVERITY_BADGE[severity]

  return (
    <div className={`rounded-lg border p-3 shadow-sm ${SEVERITY_CARD_CLASS[severity]}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-red-900 hover:underline"
          title={v.review_notice || undefined}
        >
          {v.name}
        </a>
        {badge.label && (
          <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        <CardField label="Rating" value={v.current_rating ? `⭐ ${v.current_rating}` : "—"} />
        <CardField label="Real" value={v.real_score ? `⭐ ${v.real_score.toFixed(1)}` : "—"} />
        <CardField label="Reviews" value={v.total_reviews.toLocaleString()} />
        <CardField
          label="Deleted"
          value={v.deleted_estimate > 0 ? `~${Math.round(v.deleted_estimate)} (${v.percentage_deleted.toFixed(1)}%)` : "—"}
        />
        <CardField label="Gap" value={v.rating_gap > 0 ? `-${v.rating_gap.toFixed(2)}` : "—"} />
        <CardField label="Type" value={v.venue_type} />
      </div>
    </div>
  )
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium uppercase text-gray-400">{label}</span>
      <span className="ml-1.5 text-gray-700">{value}</span>
    </div>
  )
}
