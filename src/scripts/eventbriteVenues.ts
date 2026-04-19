import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const INPUT_FILE = "eventbrite_events_url.txt";
const OUTPUT_FILE = "eventbrite_venues.txt";

function extractEventId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Match normal Eventbrite ticket URLs:
  // ...-tickets-1343862090689?aff=...
  const ticketsMatch = trimmed.match(/-tickets-(\d+)(?:\?|\/|$)/i);
  if (ticketsMatch?.[1]) return ticketsMatch[1];

  // Fallback: last long numeric segment anywhere in the URL
  const allMatches = [...trimmed.matchAll(/(\d{6,})/g)];
  return allMatches.length ? allMatches[allMatches.length - 1][1] : null;
}

function cleanCsvValue(value: string): string {
  // Replace line breaks and commas so the file stays simple comma-delimited
  return value.replace(/[\r\n]+/g, " ").replace(/,/g, " ").trim();
}

function buildAddress(address1?: string | null, address2?: string | null): string {
  return [address1?.trim(), address2?.trim()].filter(Boolean).join(" ");
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as T;
}

type EventbriteEventResponse = {
  id: string;
  venue_id?: string | null;
};

type EventbriteVenueResponse = {
  id: string;
  name?: string | null;
  address?: {
    address_1?: string | null;
    address_2?: string | null;
  } | null;
};

async function getVenueIdFromEvent(eventId: string, apiKey: string): Promise<string | null> {
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/`;
  const data = await fetchJson<EventbriteEventResponse>(url, apiKey);
  return data.venue_id ?? null;
}

async function getVenueDetails(
  venueId: string,
  apiKey: string
): Promise<{ venueId: string; name: string; address: string }> {
  const url = `https://www.eventbriteapi.com/v3/venues/${venueId}/`;
  const data = await fetchJson<EventbriteVenueResponse>(url, apiKey);

  const name = cleanCsvValue(data.name ?? "");
  const address = cleanCsvValue(
    buildAddress(data.address?.address_1 ?? "", data.address?.address_2 ?? "")
  );

  return {
    venueId,
    name,
    address,
  };
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

  const uniqueVenueIds = new Set<string>();

  for (const eventId of uniqueEventIds) {
    try {
      const venueId = await getVenueIdFromEvent(eventId, apiKey);
      if (venueId) {
        uniqueVenueIds.add(venueId);
        console.log(`Event ${eventId} -> venue ${venueId}`);
      } else {
        console.warn(`Event ${eventId} returned no venue_id`);
      }
    } catch (error) {
      console.error(
        `Failed to fetch event ${eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const rows: string[] = [];

  for (const venueId of uniqueVenueIds) {
    try {
      const venue = await getVenueDetails(venueId, apiKey);
      rows.push(`${venue.venueId},${venue.name},${venue.address}`);
      console.log(`Venue ${venueId} -> ${venue.name} -> ${venue.address}`);
    } catch (error) {
      console.error(
        `Failed to fetch venue ${venueId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  await fs.writeFile(outputPath, rows.join("\n"), "utf8");
  console.log(`Done. Wrote ${rows.length} venue row(s) to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});