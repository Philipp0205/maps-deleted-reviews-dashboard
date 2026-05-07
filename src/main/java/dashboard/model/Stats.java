package dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Aggregate statistics computed from a list of venues.
 */
public record Stats(
        @JsonProperty("total_venues") int totalVenues,
        @JsonProperty("venues_with_deletions") int venuesWithDeletions,
        @JsonProperty("total_deleted_reviews") int totalDeletedReviews,
        @JsonProperty("avg_rating_gap") double avgRatingGap,
        List<String> cities,
        @JsonProperty("venue_types") List<String> venueTypes,
        @JsonProperty("latest_scrape") String latestScrape
) {
}
