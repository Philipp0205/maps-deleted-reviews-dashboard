import { useState, useEffect, useMemo } from "react"
import { Header } from "./components/header"
import { Controls } from "./components/controls"
import { VenueTable } from "./components/venue-table"
import { ChartsView } from "./components/charts-view"
import { MapView } from "./components/map-view"
import { type DashboardData, type Filters, type ViewTab } from "./lib/types"
import { filterVenues } from "./lib/venue-utils"

const INITIAL_FILTERS: Filters = {
  search: "",
  city: "",
  venueType: "",
  deletionsOnly: true,
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [activeView, setActiveView] = useState<ViewTab>("table")

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d))
  }, [])

  const filtered = useMemo(
    () => (data ? filterVenues(data.venues, filters) : []),
    [data, filters],
  )

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header stats={data.stats} />
      <Controls
        filters={filters}
        onFiltersChange={setFilters}
        activeView={activeView}
        onViewChange={setActiveView}
        cities={data.stats.cities}
        venueTypes={data.stats.venue_types}
      />
      {activeView === "table" && <VenueTable venues={filtered} />}
      {activeView === "charts" && <ChartsView venues={filtered} />}
      {activeView === "map" && <MapView venues={filtered} />}
    </div>
  )
}
