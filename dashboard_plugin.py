"""Deleted Reviews dashboard plugin — visualizes Google Maps deleted review data."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse


def _load_all_venues(data_dir: Path) -> list[dict]:
    """Load and merge all CSV files + summary metadata into venue dicts."""
    summaries = {}
    for sf in data_dir.glob("summary-*.json"):
        try:
            s = json.loads(sf.read_text())
            key = sf.stem.replace("summary-", "")
            summaries[key] = s
        except (json.JSONDecodeError, ValueError):
            continue

    venues: list[dict] = []
    for csv_file in sorted(data_dir.glob("deleted-reviews-*.csv")):
        key = csv_file.stem.replace("deleted-reviews-", "")
        summary = summaries.get(key, {})
        city = summary.get("city", _city_from_key(key))
        scraped_at = summary.get("finishedAt", "")

        try:
            text = csv_file.read_text(encoding="utf-8")
            reader = csv.DictReader(text.splitlines())
            for row in reader:
                if row.get("status") == "failed":
                    continue
                venues.append(_parse_venue(row, city, key, scraped_at))
        except Exception:
            continue

    return venues


def _city_from_key(key: str) -> str:
    """Extract city name from file key like 'stuttgart-west-restaurant'."""
    parts = key.rsplit("-", 1)
    return parts[0].replace("-", " ").title() if parts else key.title()


def _parse_venue(row: dict, city: str, dataset_key: str, scraped_at: str) -> dict:
    """Parse a CSV row into a clean venue dict."""
    return {
        "name": row.get("name", "").strip(),
        "venue_type": row.get("venue_type", "").strip(),
        "city": city,
        "dataset": dataset_key,
        "total_reviews": _to_int(row.get("total_reviews")),
        "deleted_min": _to_int(row.get("deleted_reviews_min")),
        "deleted_max": _to_int(row.get("deleted_reviews_max")),
        "deleted_estimate": _to_float(row.get("deleted_reviews_estimate")),
        "percentage_deleted": _to_float(row.get("percentage_deleted")),
        "current_rating": _to_float(row.get("current_star_rating")),
        "real_score": _to_float(row.get("real_score")),
        "rating_gap": round(
            _to_float(row.get("current_star_rating"))
            - _to_float(row.get("real_score")),
            4,
        ),
        "review_notice": row.get("review_notice", "").strip(),
        "url": row.get("url", "").strip(),
        "address": row.get("address", "").strip(),
        "scraped_at": row.get("scraped_at", scraped_at).strip(),
        "has_deletions": _to_float(row.get("deleted_reviews_estimate", 0)) > 0,
    }


def _to_int(val: str | None) -> int:
    try:
        return int(float(val)) if val else 0
    except (ValueError, TypeError):
        return 0


def _to_float(val: str | None) -> float:
    try:
        return round(float(val), 4) if val else 0.0
    except (ValueError, TypeError):
        return 0.0


def _compute_stats(venues: list[dict]) -> dict:
    """Compute aggregate statistics."""
    with_deletions = [v for v in venues if v["has_deletions"]]
    total_deleted = sum(v["deleted_estimate"] for v in with_deletions)
    avg_gap = (
        round(sum(v["rating_gap"] for v in with_deletions) / len(with_deletions), 2)
        if with_deletions
        else 0
    )
    cities = sorted(set(v["city"] for v in venues))
    types = sorted(set(v["venue_type"].lower() for v in venues if v["venue_type"]))
    latest_scrape = max(
        (v["scraped_at"] for v in venues if v["scraped_at"]), default=""
    )

    return {
        "total_venues": len(venues),
        "venues_with_deletions": len(with_deletions),
        "total_deleted_reviews": int(total_deleted),
        "avg_rating_gap": avg_gap,
        "cities": cities,
        "venue_types": types,
        "latest_scrape": latest_scrape,
    }


def register(app: FastAPI, nav, config: dict) -> None:
    from app.layout import page_shell

    plugin_dir = Path(config["path"])
    mount = config.get("mount", "/reviews")
    data_dir = Path(config.get("data_dir", str(plugin_dir / ".." / "maps-deleted-reviews" / "output")))

    nav.add(label="Deleted Reviews", icon="\U0001f5d1\ufe0f", href=mount, order=30)

    @app.get(mount, response_class=HTMLResponse)
    async def reviews_page():
        body = _build_body(mount)
        extra_css = _build_css()
        return page_shell(nav, mount, "Deleted Reviews Dashboard", body, extra_css)

    @app.get(f"{mount}/api/data")
    async def api_data():
        venues = _load_all_venues(data_dir)
        stats = _compute_stats(venues)
        return JSONResponse({"venues": venues, "stats": stats})


def _build_body(mount: str) -> str:
    return f"""
<div class="header">
    <h1>\U0001f5d1\ufe0f Deleted Reviews Dashboard</h1>
    <p>Google Maps venues with reviews removed due to defamation complaints</p>
    <div class="stats-bar" id="stats-bar"></div>
</div>

<div class="controls">
    <input type="text" id="search" placeholder="Search venue name...">
    <select id="city-filter"><option value="">All Cities</option></select>
    <select id="type-filter"><option value="">All Types</option></select>
    <label class="toggle-label">
        <input type="checkbox" id="deletions-only" checked>
        Only with deletions
    </label>
    <div class="view-tabs">
        <button class="view-tab active" data-view="table" onclick="switchView('table')">\U0001f4cb Table</button>
        <button class="view-tab" data-view="charts" onclick="switchView('charts')">\U0001f4ca Charts</button>
        <button class="view-tab" data-view="map" onclick="switchView('map')">\U0001f5fa\ufe0f Map</button>
    </div>
</div>

<div id="view-table" class="view-panel active">
    <div class="result-count" id="result-count"></div>
    <div class="table-wrap">
        <table id="venues-table">
            <thead>
                <tr>
                    <th data-sort="name" class="sortable">Venue \u25bf</th>
                    <th data-sort="city" class="sortable">City \u25bf</th>
                    <th data-sort="venue_type" class="sortable">Type \u25bf</th>
                    <th data-sort="total_reviews" class="sortable num">Reviews \u25bf</th>
                    <th data-sort="deleted_estimate" class="sortable num">Deleted \u25bf</th>
                    <th data-sort="percentage_deleted" class="sortable num">% Del \u25bf</th>
                    <th data-sort="current_rating" class="sortable num">Rating \u25bf</th>
                    <th data-sort="real_score" class="sortable num">Real \u25bf</th>
                    <th data-sort="rating_gap" class="sortable num">Gap \u25bf</th>
                </tr>
            </thead>
            <tbody id="venues-tbody"></tbody>
        </table>
    </div>
</div>

<div id="view-charts" class="view-panel">
    <div class="charts-grid">
        <div class="chart-card">
            <h3>Top Offenders by % Deleted</h3>
            <div class="chart-toggle">
                <button class="mini-btn active" onclick="setBarMode('pct')">% Deleted</button>
                <button class="mini-btn" onclick="setBarMode('abs')">Absolute</button>
            </div>
            <canvas id="bar-chart" height="400"></canvas>
        </div>
        <div class="chart-card">
            <h3>Rating Gap: Current vs Real Score</h3>
            <canvas id="scatter-chart" height="350"></canvas>
        </div>
        <div class="chart-card">
            <h3>Deletions by City &amp; Type</h3>
            <canvas id="breakdown-chart" height="300"></canvas>
        </div>
    </div>
</div>

<div id="view-map" class="view-panel">
    <div id="map-container" style="height:600px;border-radius:12px;overflow:hidden;"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<script>
const API = "{mount}";
let allVenues = [], stats = {{}};
let sortCol = "percentage_deleted", sortAsc = false;
let barMode = "pct";
let barChart = null, scatterChart = null, breakdownChart = null;
let leafletMap = null, markerLayer = null;

async function init() {{
    const resp = await fetch(API + "/api/data");
    const data = await resp.json();
    allVenues = data.venues;
    stats = data.stats;
    renderStats();
    populateFilters();
    renderTable();
}}

function renderStats() {{
    document.getElementById("stats-bar").innerHTML = `
        <span class="stat-pill">\U0001f4cd ${{stats.total_venues}} Venues</span>
        <span class="stat-pill warn">\u26a0\ufe0f ${{stats.venues_with_deletions}} With Deletions</span>
        <span class="stat-pill danger">\U0001f5d1\ufe0f ${{stats.total_deleted_reviews}} Deleted Reviews</span>
        <span class="stat-pill">\U0001f4c9 ${{stats.avg_rating_gap}} Avg Gap</span>
        <span class="stat-pill dim">\U0001f550 ${{stats.latest_scrape ? new Date(stats.latest_scrape).toLocaleDateString() : "\u2014"}}</span>`;
}}

function populateFilters() {{
    const cf = document.getElementById("city-filter");
    stats.cities.forEach(c => {{ const o = document.createElement("option"); o.value = c; o.textContent = c; cf.appendChild(o); }});
    const tf = document.getElementById("type-filter");
    stats.venue_types.forEach(t => {{ const o = document.createElement("option"); o.value = t; o.textContent = t.charAt(0).toUpperCase() + t.slice(1); tf.appendChild(o); }});
}}

function getFiltered() {{
    const search = document.getElementById("search").value.toLowerCase();
    const city = document.getElementById("city-filter").value;
    const type = document.getElementById("type-filter").value;
    const delOnly = document.getElementById("deletions-only").checked;
    return allVenues.filter(v => {{
        if (delOnly && !v.has_deletions) return false;
        if (city && v.city !== city) return false;
        if (type && v.venue_type.toLowerCase() !== type) return false;
        if (search && !v.name.toLowerCase().includes(search)) return false;
        return true;
    }});
}}

function getSorted(venues) {{
    return [...venues].sort((a, b) => {{
        let va = a[sortCol], vb = b[sortCol];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
    }});
}}

function severityClass(pct) {{
    if (pct >= 10) return "severity-high";
    if (pct >= 5) return "severity-med";
    if (pct > 0) return "severity-low";
    return "";
}}

function severityBadge(pct) {{
    if (pct >= 10) return '<span class="sev-badge high">\U0001f534 High</span>';
    if (pct >= 5) return '<span class="sev-badge med">\U0001f7e1 Med</span>';
    if (pct > 0) return '<span class="sev-badge low">\U0001f7e2 Low</span>';
    return "";
}}

function esc(s) {{ return s ? s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }}

function renderTable() {{
    const venues = getSorted(getFiltered());
    document.getElementById("result-count").textContent = `Showing ${{venues.length}} venues`;
    const tbody = document.getElementById("venues-tbody");
    tbody.innerHTML = venues.slice(0, 300).map(v => {{
        const cls = severityClass(v.percentage_deleted);
        const notice = v.review_notice ? ` title="${{esc(v.review_notice)}}"` : "";
        return `<tr class="${{cls}}">
            <td><a href="${{v.url}}" target="_blank"${{notice}}>${{esc(v.name)}}</a></td>
            <td>${{esc(v.city)}}</td>
            <td>${{esc(v.venue_type)}}</td>
            <td class="num">${{v.total_reviews.toLocaleString()}}</td>
            <td class="num">${{v.deleted_estimate > 0 ? "~" + Math.round(v.deleted_estimate) : "\u2014"}}</td>
            <td class="num">${{v.percentage_deleted > 0 ? v.percentage_deleted.toFixed(1) + "%" : "\u2014"}} ${{severityBadge(v.percentage_deleted)}}</td>
            <td class="num">\u2b50 ${{v.current_rating || "\u2014"}}</td>
            <td class="num">${{v.real_score ? "\u2b50 " + v.real_score.toFixed(1) : "\u2014"}}</td>
            <td class="num">${{v.rating_gap > 0 ? "-" + v.rating_gap.toFixed(2) : "\u2014"}}</td>
        </tr>`;
    }}).join("");
}}

function handleSort(col) {{
    if (sortCol === col) {{ sortAsc = !sortAsc; }} else {{ sortCol = col; sortAsc = col === "name" || col === "city"; }}
    document.querySelectorAll("th.sortable").forEach(th => {{
        const arrow = th.dataset.sort === sortCol ? (sortAsc ? " \u25b4" : " \u25be") : " \u25bf";
        th.textContent = th.textContent.replace(/ [\u25b4\u25be\u25bf]$/, "") + arrow;
    }});
    renderTable();
}}

document.querySelectorAll("th.sortable").forEach(th => th.addEventListener("click", () => handleSort(th.dataset.sort)));
document.getElementById("search").addEventListener("input", () => {{ renderTable(); renderActiveView(); }});
document.getElementById("city-filter").addEventListener("change", () => {{ renderTable(); renderActiveView(); }});
document.getElementById("type-filter").addEventListener("change", () => {{ renderTable(); renderActiveView(); }});
document.getElementById("deletions-only").addEventListener("change", () => {{ renderTable(); renderActiveView(); }});

// -- Views --
function switchView(view) {{
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
    document.getElementById("view-" + view).classList.add("active");
    document.querySelector(`.view-tab[data-view="${{view}}"]`).classList.add("active");
    renderActiveView();
}}

function renderActiveView() {{
    const active = document.querySelector(".view-panel.active");
    if (active.id === "view-charts") renderCharts();
    if (active.id === "view-map") renderMap();
}}

// -- Charts --
function renderCharts() {{
    const venues = getFiltered().filter(v => v.has_deletions);
    renderBarChart(venues);
    renderScatterChart(venues);
    renderBreakdownChart(venues);
}}

function setBarMode(mode) {{
    barMode = mode;
    document.querySelectorAll(".chart-card .mini-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    renderBarChart(getFiltered().filter(v => v.has_deletions));
}}

function renderBarChart(venues) {{
    const sorted = [...venues].sort((a, b) => barMode === "pct" ? b.percentage_deleted - a.percentage_deleted : b.deleted_estimate - a.deleted_estimate).slice(0, 20);
    const labels = sorted.map(v => v.name.length > 25 ? v.name.slice(0, 22) + "..." : v.name);
    const values = sorted.map(v => barMode === "pct" ? v.percentage_deleted : v.deleted_estimate);
    const colors = sorted.map(v => v.percentage_deleted >= 10 ? "#ef4444" : v.percentage_deleted >= 5 ? "#f59e0b" : "#22c55e");

    if (barChart) barChart.destroy();
    barChart = new Chart(document.getElementById("bar-chart"), {{
        type: "bar",
        data: {{ labels, datasets: [{{ data: values, backgroundColor: colors, borderRadius: 4 }}] }},
        options: {{
            indexAxis: "y",
            plugins: {{ legend: {{ display: false }}, tooltip: {{ callbacks: {{ label: ctx => barMode === "pct" ? ctx.raw.toFixed(1) + "%" : "~" + Math.round(ctx.raw) + " reviews" }} }} }},
            scales: {{ x: {{ title: {{ display: true, text: barMode === "pct" ? "% Deleted" : "Deleted Reviews (est.)" }} }} }}
        }}
    }});
}}

function renderScatterChart(venues) {{
    const data = venues.filter(v => v.current_rating && v.real_score).map(v => ({{
        x: v.current_rating, y: v.real_score,
        r: Math.max(4, Math.min(20, Math.sqrt(v.deleted_estimate) * 1.5)),
        label: v.name, deleted: v.deleted_estimate
    }}));

    if (scatterChart) scatterChart.destroy();
    scatterChart = new Chart(document.getElementById("scatter-chart"), {{
        type: "bubble",
        data: {{ datasets: [{{
            data, backgroundColor: "rgba(239,68,68,0.5)", borderColor: "rgba(239,68,68,0.8)", borderWidth: 1
        }}] }},
        options: {{
            plugins: {{
                legend: {{ display: false }},
                tooltip: {{ callbacks: {{ label: ctx => `${{ctx.raw.label}}: ${{ctx.raw.x}}\u2b50 \u2192 ${{ctx.raw.y.toFixed(1)}}\u2b50 (~${{Math.round(ctx.raw.deleted)}} deleted)` }} }}
            }},
            scales: {{
                x: {{ title: {{ display: true, text: "Current Rating" }}, min: 3.5, max: 5.1 }},
                y: {{ title: {{ display: true, text: "Real Score" }}, min: 3.0, max: 5.1 }}
            }}
        }}
    }});
    // Draw diagonal reference line
    const origDraw = scatterChart.draw.bind(scatterChart);
    scatterChart.draw = function() {{
        origDraw();
        const xScale = scatterChart.scales.x, yScale = scatterChart.scales.y;
        const ctx = scatterChart.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(xScale.getPixelForValue(3.5), yScale.getPixelForValue(3.5));
        ctx.lineTo(xScale.getPixelForValue(5), yScale.getPixelForValue(5));
        ctx.stroke();
        ctx.restore();
    }};
    scatterChart.draw();
}}

function renderBreakdownChart(venues) {{
    const groups = {{}};
    venues.forEach(v => {{
        const key = `${{v.city}} \u2014 ${{v.venue_type || "other"}}`;
        groups[key] = (groups[key] || 0) + v.deleted_estimate;
    }});
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => Math.round(e[1]));
    const palette = ["#ef4444","#f59e0b","#3b82f6","#8b5cf6","#22c55e","#ec4899","#14b8a6","#f97316"];

    if (breakdownChart) breakdownChart.destroy();
    breakdownChart = new Chart(document.getElementById("breakdown-chart"), {{
        type: "doughnut",
        data: {{ labels, datasets: [{{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 2, borderColor: "#fff" }}] }},
        options: {{
            plugins: {{
                legend: {{ position: "right" }},
                tooltip: {{ callbacks: {{ label: ctx => `${{ctx.label}}: ~${{ctx.raw}} deleted reviews` }} }}
            }}
        }}
    }});
}}

// -- Map --
const CITY_COORDS = {{
    "Stuttgart": [48.7758, 9.1829],
    "Stuttgart West": [48.7730, 9.1600],
    "Bonn": [50.7340, 7.0990]
}};

function renderMap() {{
    const venues = getFiltered().filter(v => v.has_deletions);
    if (!leafletMap) {{
        leafletMap = L.map("map-container").setView([48.7758, 9.1829], 13);
        L.tileLayer("https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png", {{
            attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
        }}).addTo(leafletMap);
        markerLayer = L.layerGroup().addTo(leafletMap);
        // Fix tile rendering after tab switch
        setTimeout(() => leafletMap.invalidateSize(), 200);
    }} else {{
        leafletMap.invalidateSize();
    }}

    markerLayer.clearLayers();

    // Extract coords from Google Maps URLs
    venues.forEach(v => {{
        const coords = extractCoords(v.url);
        if (!coords) return;
        const color = v.percentage_deleted >= 10 ? "#ef4444" : v.percentage_deleted >= 5 ? "#f59e0b" : "#22c55e";
        const radius = Math.max(6, Math.min(20, Math.sqrt(v.deleted_estimate) * 2));
        const marker = L.circleMarker(coords, {{
            radius, fillColor: color, color: "#fff", weight: 2, fillOpacity: 0.8
        }});
        marker.bindPopup(`
            <strong>${{esc(v.name)}}</strong><br>
            ${{esc(v.venue_type)}} \u00b7 ${{esc(v.city)}}<br>
            \u2b50 ${{v.current_rating}} \u2192 ${{v.real_score.toFixed(1)}} (gap: ${{v.rating_gap.toFixed(2)}})<br>
            \U0001f5d1\ufe0f ~${{Math.round(v.deleted_estimate)}} deleted (${{v.percentage_deleted.toFixed(1)}}%)<br>
            <a href="${{v.url}}" target="_blank">Open in Google Maps</a>
        `);
        markerLayer.addLayer(marker);
    }});

    // Fit bounds if we have markers
    if (markerLayer.getLayers().length > 0) {{
        const group = L.featureGroup(markerLayer.getLayers());
        leafletMap.fitBounds(group.getBounds().pad(0.1));
    }}
}}

function extractCoords(url) {{
    // Google Maps URLs contain !3d<lat>!4d<lng>
    const latMatch = url.match(/!3d(-?\\d+\\.\\d+)/);
    const lngMatch = url.match(/!4d(-?\\d+\\.\\d+)/);
    if (latMatch && lngMatch) return [parseFloat(latMatch[1]), parseFloat(lngMatch[1])];
    return null;
}}

init();
</script>"""


def _build_css() -> str:
    return """
    .header { background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f59e0b 100%); color: white; padding: 2rem; text-align: center; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .stats-bar { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    .stat-pill { background: rgba(255,255,255,0.15); padding: 0.4rem 1.2rem; border-radius: 2rem; font-size: 0.85rem; }
    .stat-pill.warn { background: rgba(245,158,11,0.3); }
    .stat-pill.danger { background: rgba(239,68,68,0.3); }
    .stat-pill.dim { opacity: 0.7; }

    .controls { max-width: 1400px; margin: 1.5rem auto; padding: 0 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .controls input, .controls select { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 0.9rem; }
    .controls input { flex: 1; min-width: 180px; }
    .controls select { min-width: 130px; }
    .toggle-label { font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 0.5rem; background: white; }
    .toggle-label input:checked + span, .toggle-label:has(input:checked) { background: #fef2f2; border-color: #fca5a5; }

    .view-tabs { display: flex; gap: 2px; margin-left: auto; }
    .view-tab { padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 0.85rem; border-radius: 0; }
    .view-tab:first-child { border-radius: 0.5rem 0 0 0.5rem; }
    .view-tab:last-child { border-radius: 0 0.5rem 0.5rem 0; }
    .view-tab.active { background: #7f1d1d; color: white; border-color: #7f1d1d; }

    .view-panel { display: none; max-width: 1400px; margin: 0 auto; padding: 0 1rem 2rem; }
    .view-panel.active { display: block; }

    .result-count { font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-size: 0.85rem; }
    th { background: #fafafa; text-align: left; padding: 10px 12px; font-size: 0.75rem; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; white-space: nowrap; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { color: #333; }
    th.num, td.num { text-align: right; }
    td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    tr:hover { background: #fafafa; }
    tr.severity-high { background: #fef2f2; }
    tr.severity-high:hover { background: #fee2e2; }
    tr.severity-med { background: #fffbeb; }
    tr.severity-med:hover { background: #fef3c7; }
    td a { color: #7f1d1d; text-decoration: none; font-weight: 500; }
    td a:hover { text-decoration: underline; }

    .sev-badge { display: inline-block; font-size: 0.7rem; padding: 1px 6px; border-radius: 8px; margin-left: 4px; }
    .sev-badge.high { background: #fecaca; color: #991b1b; }
    .sev-badge.med { background: #fde68a; color: #92400e; }
    .sev-badge.low { background: #d1fae5; color: #065f46; }

    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .charts-grid .chart-card:first-child { grid-column: 1 / -1; }
    .chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .chart-card h3 { font-size: 1rem; margin-bottom: 0.75rem; color: #333; }
    .chart-toggle { margin-bottom: 0.75rem; }
    .mini-btn { padding: 4px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-right: 4px; }
    .mini-btn.active { background: #7f1d1d; color: white; border-color: #7f1d1d; }

    #map-container { box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    @media (max-width: 768px) {
        .charts-grid { grid-template-columns: 1fr; }
        .controls { flex-direction: column; }
        .view-tabs { margin-left: 0; }
    }
"""
