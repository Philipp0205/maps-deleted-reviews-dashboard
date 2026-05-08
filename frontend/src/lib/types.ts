export interface Venue {
  name: string
  city: string
  dataset: string
  url: string
  address: string
  venue_type: string
  total_reviews: number
  deleted_min: number
  deleted_max: number
  deleted_estimate: number
  percentage_deleted: number
  current_rating: number
  real_score: number
  rating_gap: number
  review_notice: string
  scraped_at: string
  has_deletions: boolean
}

export interface Stats {
  cities: string[]
  total_venues: number
  venues_with_deletions: number
  total_deleted_reviews: number
  avg_rating_gap: number
  venue_types: string[]
  latest_scrape: string
}

export interface DashboardData {
  stats: Stats
  venues: Venue[]
}

export type SortColumn = keyof Venue
export type SortDirection = "asc" | "desc"
export type ViewTab = "table" | "charts" | "map"

export interface Filters {
  search: string
  city: string
  venueType: string
  deletionsOnly: boolean
}
