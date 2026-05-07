package dashboard.stats;

import dashboard.model.Stats;
import dashboard.model.Venue;

import java.util.List;
import java.util.TreeSet;

/**
 * Computes aggregate statistics from a list of venues.
 * Pure function — no side effects.
 */
public final class StatsComputer {

    private StatsComputer() {}

    public static Stats compute(List<Venue> venues) {
        var withDeletions = venues.stream()
                .filter(Venue::hasDeletions)
                .toList();

        int totalDeleted = (int) withDeletions.stream()
                .mapToDouble(Venue::deletedEstimate)
                .sum();

        double avgGap = withDeletions.isEmpty() ? 0.0
                : Math.round(withDeletions.stream()
                        .mapToDouble(Venue::ratingGap)
                        .average()
                        .orElse(0.0) * 100.0) / 100.0;

        var cities = new TreeSet<String>();
        var types = new TreeSet<String>();
        String latestScrape = "";

        for (Venue v : venues) {
            cities.add(v.city());
            if (!v.venueType().isEmpty()) {
                types.add(v.venueType().toLowerCase());
            }
            if (!v.scrapedAt().isEmpty() && v.scrapedAt().compareTo(latestScrape) > 0) {
                latestScrape = v.scrapedAt();
            }
        }

        return new Stats(
                venues.size(),
                withDeletions.size(),
                totalDeleted,
                avgGap,
                List.copyOf(cities),
                List.copyOf(types),
                latestScrape
        );
    }
}
