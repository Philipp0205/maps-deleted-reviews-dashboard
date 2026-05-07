package dashboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import dashboard.loader.VenueLoader;
import dashboard.site.SiteBuilder;
import dashboard.stats.StatsComputer;
import gg.jte.ContentType;
import gg.jte.TemplateEngine;

import java.nio.file.Path;

/**
 * CLI entry point for static site generation.
 *
 * Usage: java -jar dashboard.jar [--data-dir path] [--output-dir path]
 */
public final class Main {

    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of(resolveArg(args, "--data-dir",
                Path.of("..","maps-deleted-reviews", "output").toString()));
        Path outputDir = Path.of(resolveArg(args, "--output-dir", "docs"));

        System.out.printf("Data dir:   %s%n", dataDir.toAbsolutePath());
        System.out.printf("Output dir: %s%n", outputDir.toAbsolutePath());

        var mapper = new ObjectMapper();
        var loader = new VenueLoader(mapper);
        var templateEngine = TemplateEngine.createPrecompiled(ContentType.Plain);
        var builder = new SiteBuilder(mapper, templateEngine);

        var venues = loader.load(dataDir);
        var stats = StatsComputer.compute(venues);

        builder.build(outputDir, venues, stats);

        System.out.printf("%nDone. %d venues, %d with deletions.%n",
                stats.totalVenues(), stats.venuesWithDeletions());
    }

    private static String resolveArg(String[] args, String flag, String defaultValue) {
        for (int i = 0; i < args.length - 1; i++) {
            if (flag.equals(args[i])) {
                return args[i + 1];
            }
        }
        return defaultValue;
    }
}
