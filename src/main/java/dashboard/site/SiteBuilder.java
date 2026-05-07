package dashboard.site;

import com.fasterxml.jackson.databind.ObjectMapper;
import dashboard.model.Stats;
import dashboard.model.Venue;
import gg.jte.ContentType;
import gg.jte.TemplateEngine;
import gg.jte.TemplateOutput;
import gg.jte.output.FileOutput;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Generates the static site: index.html and data.json.
 */
public final class SiteBuilder {

    private final ObjectMapper mapper;
    private final TemplateEngine templateEngine;

    public SiteBuilder(ObjectMapper mapper, TemplateEngine templateEngine) {
        this.mapper = mapper;
        this.templateEngine = templateEngine;
    }

    /** Build the complete static site into the output directory. */
    public void build(Path outputDir, List<Venue> venues, Stats stats) throws IOException {
        Files.createDirectories(outputDir);

        writeDataJson(outputDir, venues, stats);
        writeIndexHtml(outputDir, venues, stats);
    }

    private void writeDataJson(Path outputDir, List<Venue> venues, Stats stats) throws IOException {
        var data = Map.of("venues", venues, "stats", stats);
        Path dataPath = outputDir.resolve("data.json");
        mapper.writerWithDefaultPrettyPrinter()
                .writeValue(dataPath.toFile(), data);
        System.out.printf("Wrote %s (%d venues)%n", dataPath, venues.size());
    }

    private void writeIndexHtml(Path outputDir, List<Venue> venues, Stats stats) throws IOException {
        String dataJson = mapper.writeValueAsString(
                Map.of("venues", venues, "stats", stats));

        Path outPath = outputDir.resolve("index.html");
        var output = new gg.jte.output.StringOutput();
        templateEngine.render("index.jte",
                Map.of("venues", venues, "stats", stats, "dataJson", dataJson),
                output);
        Files.writeString(outPath, output.toString(), StandardCharsets.UTF_8);
        System.out.printf("Wrote %s%n", outPath);
    }
}
