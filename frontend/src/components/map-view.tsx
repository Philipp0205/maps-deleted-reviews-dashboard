import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { type Venue } from "../lib/types"
import { extractCoords } from "../lib/venue-utils"

interface MapViewProps {
  venues: Venue[]
}

export function MapView({ venues }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const withDeletions = venues.filter((v) => v.has_deletions)

  useEffect(() => {
    if (!containerRef.current) return

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([48.7758, 9.1829], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapRef.current)
      markerLayerRef.current = L.layerGroup().addTo(mapRef.current)
    }

    const map = mapRef.current
    const markerLayer = markerLayerRef.current!

    setTimeout(() => map.invalidateSize(), 200)
    markerLayer.clearLayers()

    withDeletions.forEach((v) => {
      const coords = extractCoords(v.url)
      if (!coords) return

      const color =
        v.percentage_deleted >= 10 ? "#ef4444" : v.percentage_deleted >= 5 ? "#f59e0b" : "#22c55e"
      const radius = Math.max(6, Math.min(20, Math.sqrt(v.deleted_estimate) * 2))

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.8,
      })

      marker.bindPopup(`
        <strong>${v.name}</strong><br>
        ${v.venue_type} · ${v.city}<br>
        ⭐ ${v.current_rating} → ${v.real_score.toFixed(1)} (gap: ${v.rating_gap.toFixed(2)})<br>
        🗑️ ~${Math.round(v.deleted_estimate)} deleted (${v.percentage_deleted.toFixed(1)}%)<br>
        <a href="${v.url}" target="_blank">Open in Google Maps</a>
      `)

      markerLayer.addLayer(marker)
    })

    if (markerLayer.getLayers().length > 0) {
      const group = L.featureGroup(markerLayer.getLayers())
      map.fitBounds(group.getBounds().pad(0.1))
    }
  }, [withDeletions])

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <div
        ref={containerRef}
        className="h-[500px] overflow-hidden rounded-xl shadow-sm sm:h-[600px]"
      />
    </div>
  )
}
