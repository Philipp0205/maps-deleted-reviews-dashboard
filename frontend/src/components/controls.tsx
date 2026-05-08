import { type Filters, type ViewTab } from "../lib/types"

interface ControlsProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  activeView: ViewTab
  onViewChange: (view: ViewTab) => void
  cities: string[]
  venueTypes: string[]
}

export function Controls({
  filters,
  onFiltersChange,
  activeView,
  onViewChange,
  cities,
  venueTypes,
}: ControlsProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onFiltersChange({ ...filters, [key]: value })

  const tabs: { id: ViewTab; label: string }[] = [
    { id: "table", label: "📋 Table" },
    { id: "charts", label: "📊 Charts" },
    { id: "map", label: "🗺️ Map" },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        type="text"
        placeholder="Search venue name..."
        value={filters.search}
        onChange={(e) => updateFilter("search", e.target.value)}
        className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
      <select
        value={filters.city}
        onChange={(e) => updateFilter("city", e.target.value)}
        className="min-w-[130px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">All Cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={filters.venueType}
        onChange={(e) => updateFilter("venueType", e.target.value)}
        className="min-w-[130px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">All Types</option>
        {venueTypes.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
        <input
          type="checkbox"
          checked={filters.deletionsOnly}
          onChange={(e) => updateFilter("deletionsOnly", e.target.checked)}
          className="rounded text-red-600 focus:ring-red-500"
        />
        Only with deletions
      </label>
      <div className="flex gap-px sm:ml-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`px-3 py-2 text-sm font-medium first:rounded-l-lg last:rounded-r-lg ${
              activeView === tab.id
                ? "bg-red-900 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
