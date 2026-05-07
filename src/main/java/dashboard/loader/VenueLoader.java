package dashboard.loader;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dashboard.model.Venue;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;

/**
 * Loads venue data from CSV files and summary JSON metadata.
 * Mirrors the Python _load_all_venues + _deduplicate logic.
 */
public final class VenueLoader {

    private final ObjectMapper mapper;

    public VenueLoader(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Load all venues from the data directory, deduplicated by URL. */
    public List<Venue> load(Path dataDir) throws IOException {
        var summaries = loadSummaries(dataDir);
        var venues = new ArrayList<Venue>();

        try (Stream<Path> csvFiles = Files.list(dataDir)
                .filter(p -> p.getFileName().toString().startsWith("deleted-reviews-"))
                .filter(p -> p.getFileName().toString().endsWith(".csv"))
                .sorted()) {

            for (Path csvFile : csvFiles.toList()) {
                String key = extractKey(csvFile, "deleted-reviews-");
                JsonNode summary = summaries.getOrDefault(key, mapper.createObjectNode());
                String city = summary.has("city")
                        ? summary.get("city").asText()
                        : cityFromKey(key);
                String scrapedAt = summary.has("finishedAt")
                        ? summary.get("finishedAt").asText()
                        : "";

                parseVenuesFromCsv(csvFile, city, key, scrapedAt, venues);
            }
        }

        return deduplicate(venues);
    }

    private Map<String, JsonNode> loadSummaries(Path dataDir) throws IOException {
        var summaries = new HashMap<String, JsonNode>();

        try (Stream<Path> files = Files.list(dataDir)
                .filter(p -> p.getFileName().toString().startsWith("summary-"))
                .filter(p -> p.getFileName().toString().endsWith(".json"))) {

            for (Path file : files.toList()) {
                try {
                    String key = extractKey(file, "summary-");
                    JsonNode node = mapper.readTree(file.toFile());
                    summaries.put(key, node);
                } catch (Exception ignored) {
                    // Skip malformed summary files
                }
            }
        }

        return summaries;
    }

    private void parseVenuesFromCsv(Path csvFile, String city, String datasetKey,
                                     String scrapedAt, List<Venue> venues) {
        try {
            String content = Files.readString(csvFile, StandardCharsets.UTF_8);
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreHeaderCase(true)
                    .setTrim(true)
                    .build();

            try (CSVParser parser = CSVParser.parse(content, format)) {
                for (CSVRecord record : parser) {
                    if ("failed".equals(getField(record, "status"))) {
                        continue;
                    }
                    venues.add(parseVenue(record, city, datasetKey, scrapedAt));
                }
            }
        } catch (Exception ignored) {
            // Skip unreadable CSV files
        }
    }

    private Venue parseVenue(CSVRecord record, String city, String datasetKey, String scrapedAt) {
        double currentRating = toDouble(getField(record, "current_star_rating"));
        double realScore = toDouble(getField(record, "real_score"));
        double deletedEstimate = toDouble(getField(record, "deleted_reviews_estimate"));

        return new Venue(
                getField(record, "name").trim(),
                getField(record, "venue_type").trim(),
                city,
                datasetKey,
                toInt(getField(record, "total_reviews")),
                toInt(getField(record, "deleted_reviews_min")),
                toInt(getField(record, "deleted_reviews_max")),
                deletedEstimate,
                toDouble(getField(record, "percentage_deleted")),
                currentRating,
                realScore,
                Math.round((currentRating - realScore) * 10000.0) / 10000.0,
                getField(record, "review_notice").trim(),
                getField(record, "url").trim(),
                getField(record, "address").trim(),
                getField(record, "scraped_at").isEmpty()
                        ? scrapedAt
                        : getField(record, "scraped_at").trim(),
                deletedEstimate > 0
        );
    }

    /** Deduplicate venues by URL, keeping the most recently scraped. */
    private List<Venue> deduplicate(List<Venue> venues) {
        var seen = new LinkedHashMap<String, Venue>();
        for (Venue v : venues) {
            if (v.url().isEmpty()) continue;
            Venue existing = seen.get(v.url());
            if (existing == null || v.scrapedAt().compareTo(existing.scrapedAt()) > 0) {
                seen.put(v.url(), v);
            }
        }
        return new ArrayList<>(seen.values());
    }

    private static String extractKey(Path file, String prefix) {
        String name = file.getFileName().toString();
        String withoutPrefix = name.substring(prefix.length());
        int dotIndex = withoutPrefix.lastIndexOf('.');
        return dotIndex > 0 ? withoutPrefix.substring(0, dotIndex) : withoutPrefix;
    }

    static String cityFromKey(String key) {
        String[] parts = key.split("-");
        if (parts.length <= 1) {
            return capitalize(key);
        }
        // Last part is the venue type (e.g. "restaurant"), rest is city
        var cityParts = Arrays.copyOf(parts, parts.length - 1);
        return Arrays.stream(cityParts)
                .map(VenueLoader::capitalize)
                .reduce((a, b) -> a + " " + b)
                .orElse(key);
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String getField(CSVRecord record, String name) {
        try {
            return record.isMapped(name) ? record.get(name) : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static int toInt(String val) {
        if (val == null || val.isEmpty()) return 0;
        try {
            return (int) Double.parseDouble(val);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static double toDouble(String val) {
        if (val == null || val.isEmpty()) return 0.0;
        try {
            return Math.round(Double.parseDouble(val) * 10000.0) / 10000.0;
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
