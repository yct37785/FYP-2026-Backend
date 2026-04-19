import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const INPUT_FILE = "eventbrite_events_url.txt";
const OUTPUT_FILE = "eventbrite_venues.txt";

function extractEventId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Best match for normal Eventbrite ticket URLs:
  // ...-tickets-1343862090689?aff=...
  const ticketsMatch = trimmed.match(/-tickets-(\d+)(?:\?|\/|$)/i);
  if (ticketsMatch?.[1]) return ticketsMatch[1];

  // Fallback: last long numeric segment anywhere in the URL
  const allMatches = [...trimmed.matchAll(/(\d{6,})/g)];
  return allMatches.length ? allMatches[allMatches.length - 1][1] : null;
}

async function getVenueId(eventId: string, apiKey: string): Promise<string | null> {
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Event ${eventId} failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as { venue_id?: string | null };
  return data.venue_id ?? null;
}

async function main(): Promise<void> {
  const apiKey = process.env.EVENTBRITE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing EVENTBRITE_API_KEY in .env");
  }

  const cwd = process.cwd();
  const inputPath = path.join(cwd, INPUT_FILE);
  const outputPath = path.join(cwd, OUTPUT_FILE);

  const raw = await fs.readFile(inputPath, "utf8");
  const urls = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (urls.length === 0) {
    await fs.writeFile(outputPath, "", "utf8");
    console.log(`No URLs found in ${INPUT_FILE}. Wrote empty ${OUTPUT_FILE}.`);
    return;
  }

  const uniqueEventIds = [
    ...new Set(
      urls
        .map(extractEventId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (uniqueEventIds.length === 0) {
    throw new Error("No valid Eventbrite event IDs found in eventbrite_events_url.txt");
  }

  const venueIds = new Set<string>();

  for (const eventId of uniqueEventIds) {
    try {
      const venueId = await getVenueId(eventId, apiKey);
      if (venueId) {
        venueIds.add(venueId);
        console.log(`Event ${eventId} -> venue ${venueId}`);
      } else {
        console.warn(`Event ${eventId} returned no venue_id`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  const content = [...venueIds].join(",");
  await fs.writeFile(outputPath, content, "utf8");

  console.log(`Done. Wrote ${venueIds.size} unique venue ID(s) to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});