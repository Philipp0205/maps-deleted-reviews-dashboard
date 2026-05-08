import { type Venue, type Filters, type SortColumn, type SortDirection } from "./types"

export const filterVenues = (venues: Venue[], filters: Filters): Venue[] =>
  venues.filter((v) => {
    if (filters.deletionsOnly && !v.has_deletions) return false
    if (filters.city && v.city !== filters.city) return false
    if (filters.venueType && v.venue_type.toLowerCase() !== filters.venueType) return false
    if (filters.search && !v.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

export const sortVenues = (
  venues: Venue[],
  column: SortColumn,
  direction: SortDirection,
): Venue[] =>
  [...venues].sort((a, b) => {
    const va = a[column]
    const vb = b[column]
    const aVal = typeof va === "string" ? va.toLowerCase() : va
    const bVal = typeof vb === "string" ? vb.toLowerCase() : vb
    if (aVal < bVal) return direction === "asc" ? -1 : 1
    if (aVal > bVal) return direction === "asc" ? 1 : -1
    return 0
  })

export const getSeverityLevel = (pct: number): "high" | "med" | "low" | "none" => {
  if (pct >= 10) return "high"
  if (pct >= 5) return "med"
  if (pct > 0) return "low"
  return "none"
}

export const extractCoords = (url: string): [number, number] | null => {
  const latMatch = url.match(/!3d(-?\d+\.\d+)/)
  const lngMatch = url.match(/!4d(-?\d+\.\d+)/)
  if (latMatch && lngMatch) return [parseFloat(latMatch[1]), parseFloat(lngMatch[1])]
  return null
}
