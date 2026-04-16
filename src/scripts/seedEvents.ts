export interface SeedEvent {
  ownerId: number;
  title: string;
  description: string;
  bannerUrl: string | null;
  categoryId: number;
  venue: string;
  address: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  pax: number;
  source: 'INTERNAL';
}

const eventTitles = [
  'Community Music Night',
  'Startup Networking Mixer',
  'Weekend Food Fair',
  'Tech Careers Meetup',
  'Sunset Yoga Session',
  'Art Jam Workshop',
  'Family Fun Carnival',
  'Charity Fun Run',
  'Business Growth Seminar',
  'Outdoor Adventure Meetup',
  'Campus Coding Bootcamp',
  'Live Band Showcase',
];

const eventDescriptions = [
  'Created directly without draft/publish flow.',
  'A great event for meeting new people and enjoying a shared interest.',
  'Join us for an engaging session with activities, networking, and fun.',
  'Perfect for students, professionals, and anyone looking to explore new experiences.',
  'A lively gathering with a welcoming atmosphere and practical takeaways.',
];

const venues = [
  { venue: 'SIM Campus Hall', address: '461 Clementi Road', city: 'Singapore' },
  { venue: 'Marina Bay Event Space', address: '12 Marina View', city: 'Singapore' },
  { venue: 'Orchard Central Studio', address: '181 Orchard Road', city: 'Singapore' },
  { venue: 'Jurong Lake Gardens Lawn', address: '104 Yuan Ching Road', city: 'Singapore' },
  { venue: 'Bugis Community Club', address: '5 Bugis Street', city: 'Singapore' },
  { venue: 'One-North Hub', address: '1 Fusionopolis Way', city: 'Singapore' },
];

const bannerUrls = [
  'https://example.com/banner-1.jpg',
  'https://example.com/banner-2.jpg',
  'https://example.com/banner-3.jpg',
  'https://example.com/banner-4.jpg',
  'https://example.com/banner-5.jpg',
];

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addHours = (date: Date, hours: number) => {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
};

export const generateSeedEvents = (
  count: number,
  options?: {
    ownerId?: number;
    categoryCount?: number;
  }
): SeedEvent[] => {
  const ownerId = options?.ownerId ?? 2;
  const categoryCount = options?.categoryCount ?? 14;

  const events: SeedEvent[] = [];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const pickedVenue = pickOne(venues);
    const startsAtBase = addDays(now, randomInt(1, 90));

    const startsAt = new Date(startsAtBase);
    startsAt.setUTCHours(randomInt(8, 20), 0, 0, 0);

    const endsAt = addHours(startsAt, randomInt(2, 4));

    const isFree = Math.random() < 0.55;
    const price = isFree ? 0 : randomInt(5, 80);
    const pax = randomInt(20, 150);

    events.push({
      ownerId,
      title: `${pickOne(eventTitles)} ${i + 1}`,
      description: pickOne(eventDescriptions),
      bannerUrl: pickOne(bannerUrls),
      categoryId: randomInt(1, categoryCount),
      venue: pickedVenue.venue,
      address: pickedVenue.address,
      city: pickedVenue.city,
      startsAt,
      endsAt,
      price,
      pax,
      source: 'INTERNAL',
    });
  }

  return events;
};