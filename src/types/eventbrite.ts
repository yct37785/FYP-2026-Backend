export interface EventbriteVenueEventsResponse {
  pagination: {
    object_count: number;
    page_number: number;
    page_size: number;
    page_count: number;
    has_more_items: boolean;
  };
  events: EventbriteEventItem[];
}

export interface EventbriteEventItem {
  id: string;
  url: string;
  created: string;
  changed: string | null;
  published: string | null;
  status: string;
  currency: string | null;
  listed: boolean;
  online_event: boolean;
  is_free: boolean;
  summary: string | null;
  venue_id: string | null;
  category_id: string | null;
  organizer_id: string | null;
  logo?: {
    url?: string | null;
    original?: {
      url?: string | null;
    } | null;
  } | null;
  name: {
    text: string | null;
    html: string | null;
  };
  description: {
    text: string | null;
    html: string | null;
  };
  start: {
    timezone: string | null;
    local: string | null;
    utc: string | null;
  };
  end: {
    timezone: string | null;
    local: string | null;
    utc: string | null;
  };
  capacity: number | string | null;
}