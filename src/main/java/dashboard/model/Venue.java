package dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Immutable venue data parsed from CSV rows + summary metadata.
 */
public record Venue(
        String name,
        @JsonProperty("venue_type") String venueType,
        String city,
        String dataset,
        @JsonProperty("total_reviews") int totalReviews,
        @JsonProperty("deleted_min") int deletedMin,
        @JsonProperty("deleted_max") int deletedMax,
        @JsonProperty("deleted_estimate") double deletedEstimate,
        @JsonProperty("percentage_deleted") double percentageDeleted,
        @JsonProperty("current_rating") double currentRating,
        @JsonProperty("real_score") double realScore,
        @JsonProperty("rating_gap") double ratingGap,
        @JsonProperty("review_notice") String reviewNotice,
        String url,
        String address,
        @JsonProperty("scraped_at") String scrapedAt,
        @JsonProperty("has_deletions") boolean hasDeletions
) {

    /** CSS class for table row severity highlighting. */
    public String severityClass() {
        if (percentageDeleted >= 10) return "severity-high";
        if (percentageDeleted >= 5) return "severity-med";
        return "";
    }

    /** HTML badge for severity indicator. */
    public String severityBadge() {
        if (percentageDeleted >= 10) return "<span class=\"sev-badge high\">\uD83D\uDD34 High</span>";
        if (percentageDeleted >= 5) return "<span class=\"sev-badge med\">\uD83D\uDFE1 Med</span>";
        if (percentageDeleted > 0) return "<span class=\"sev-badge low\">\uD83D\uDFE2 Low</span>";
        return "";
    }

    /** Formatted deleted estimate for display. */
    public String deletedDisplay() {
        if (deletedEstimate <= 0) return "\u2014";
        return "~" + Math.round(deletedEstimate);
    }

    /** Formatted percentage deleted for display. */
    public String percentageDisplay() {
        if (percentageDeleted <= 0) return "\u2014";
        return String.format("%.1f%%", percentageDeleted);
    }

    /** Formatted current rating for display. */
    public String ratingDisplay() {
        if (currentRating <= 0) return "\u2014";
        return "\u2B50 " + currentRating;
    }

    /** Formatted real score for display. */
    public String realScoreDisplay() {
        if (realScore <= 0) return "\u2014";
        return String.format("\u2B50 %.1f", realScore);
    }

    /** Formatted rating gap for display. */
    public String gapDisplay() {
        if (ratingGap <= 0) return "\u2014";
        return String.format("-%.2f", ratingGap);
    }
}
