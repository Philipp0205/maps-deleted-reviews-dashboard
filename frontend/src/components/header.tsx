import { type Stats } from "../lib/types"

interface HeaderProps {
  stats: Stats
}

export function Header({ stats }: HeaderProps) {
  const latestScrape = stats.latest_scrape
    ? new Date(stats.latest_scrape).toLocaleDateString()
    : "—"

  return (
    <div className="bg-gradient-to-r from-red-900 via-red-500 to-amber-500 px-4 py-8 text-center text-white">
      <h1 className="text-2xl font-bold sm:text-3xl">🗑️ Deleted Reviews Dashboard</h1>
      <p className="mt-1 text-sm opacity-90">
        Google Maps venues with reviews removed due to defamation complaints
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <StatPill label={`📍 ${stats.total_venues} Venues`} />
        <StatPill label={`⚠️ ${stats.venues_with_deletions} With Deletions`} variant="warn" />
        <StatPill label={`🗑️ ${stats.total_deleted_reviews} Deleted Reviews`} variant="danger" />
        <StatPill label={`📈 ${stats.avg_rating_gap} Avg Gap`} />
        <StatPill label={`🕐 ${latestScrape}`} variant="dim" />
      </div>
    </div>
  )
}

function StatPill({ label, variant }: { label: string; variant?: "warn" | "danger" | "dim" }) {
  const base = "rounded-full px-3 py-1 text-xs font-medium sm:text-sm"
  const variantClass =
    variant === "warn"
      ? "bg-amber-500/30"
      : variant === "danger"
        ? "bg-red-500/30"
        : variant === "dim"
          ? "bg-white/10 opacity-70"
          : "bg-white/15"

  return <span className={`${base} ${variantClass}`}>{label}</span>
}
