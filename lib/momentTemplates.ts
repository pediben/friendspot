/**
 * Moment creation templates.
 * All free. No emojis — luxury / minimal aesthetic.
 * Icons are Ionicons names.
 */

export type MomentTemplate = {
  id: string;
  icon: string;           // Ionicons name
  name: string;
  color: string;          // accent hex
  dim: string;            // bg tint
  category: "celebrate" | "travel" | "hangout" | "milestone";
  defaultTitle: string;   // pre-fills the title input (clean, no emoji)
  hasSecret: boolean;     // secret planning on by default?
  datePlaceholder: string;
  hint: string;           // one-line description shown on the card
};

export const MOMENT_TEMPLATES: MomentTemplate[] = [
  // ── Blank — always first so it's the default/reset ────────
  {
    id: "blank",
    icon: "add-outline",
    name: "New moment",
    color: "#6B7280",
    dim: "rgba(107,114,128,0.10)",
    category: "hangout",
    defaultTitle: "",
    hasSecret: false,
    datePlaceholder: "Date (optional)",
    hint: "Start from scratch",
  },

  // ── Celebrations ─────────────────────────────────────────
  {
    id: "birthday",
    icon: "gift-outline",
    name: "Birthday",
    color: "#C9A84C",
    dim: "rgba(201,168,76,0.12)",
    category: "celebrate",
    defaultTitle: "Birthday",
    hasSecret: true,
    datePlaceholder: "Date of the celebration",
    hint: "Secret planning on by default — hide the surprise",
  },
  {
    id: "wedding",
    icon: "heart-outline",
    name: "Wedding",
    color: "#A78BFA",
    dim: "rgba(167,139,250,0.12)",
    category: "celebrate",
    defaultTitle: "The Wedding",
    hasSecret: false,
    datePlaceholder: "Wedding date",
    hint: "Photos, costs, and the whole crew in one place",
  },
  {
    id: "graduation",
    icon: "school-outline",
    name: "Graduation",
    color: "#10B981",
    dim: "rgba(16,185,129,0.12)",
    category: "milestone",
    defaultTitle: "Graduation",
    hasSecret: false,
    datePlaceholder: "Graduation day",
    hint: "Capture the milestone — photos and memories",
  },
  {
    id: "baby_shower",
    icon: "happy-outline",
    name: "Baby Shower",
    color: "#60A5FA",
    dim: "rgba(96,165,250,0.12)",
    category: "celebrate",
    defaultTitle: "Baby Shower",
    hasSecret: true,
    datePlaceholder: "Shower date",
    hint: "Plan secretly, share photos on the day",
  },
  {
    id: "party",
    icon: "sparkles-outline",
    name: "Party",
    color: "#EC4899",
    dim: "rgba(236,72,153,0.12)",
    category: "celebrate",
    defaultTitle: "Party",
    hasSecret: false,
    datePlaceholder: "Party date",
    hint: "Shared album, split costs, coordinate the plan",
  },
  {
    id: "bachelorette",
    icon: "star-outline",
    name: "Bachelorette / Stag",
    color: "#F43F5E",
    dim: "rgba(244,63,94,0.12)",
    category: "celebrate",
    defaultTitle: "Bachelorette",
    hasSecret: true,
    datePlaceholder: "The night",
    hint: "Keep the plan hidden from the guest of honour",
  },

  // ── Travel ────────────────────────────────────────────────
  {
    id: "trip",
    icon: "airplane-outline",
    name: "Trip",
    color: "#3B82F6",
    dim: "rgba(59,130,246,0.12)",
    category: "travel",
    defaultTitle: "Trip",
    hasSecret: false,
    datePlaceholder: "Departure date",
    hint: "Split costs, share photos, plan the itinerary",
  },
  {
    id: "road_trip",
    icon: "car-outline",
    name: "Road Trip",
    color: "#F97316",
    dim: "rgba(249,115,22,0.12)",
    category: "travel",
    defaultTitle: "Road Trip",
    hasSecret: false,
    datePlaceholder: "Departure date",
    hint: "Gas, food, and memories — split it all here",
  },
  {
    id: "weekend",
    icon: "compass-outline",
    name: "Getaway",
    color: "#84CC16",
    dim: "rgba(132,204,22,0.12)",
    category: "travel",
    defaultTitle: "Weekend Getaway",
    hasSecret: false,
    datePlaceholder: "Which weekend?",
    hint: "Quick escape — plan it, live it, remember it",
  },
  {
    id: "beach",
    icon: "sunny-outline",
    name: "Beach Day",
    color: "#06B6D4",
    dim: "rgba(6,182,212,0.12)",
    category: "hangout",
    defaultTitle: "Beach Day",
    hasSecret: false,
    datePlaceholder: "Which day?",
    hint: "Good vibes, shared album, easy split",
  },

  // ── Hangouts ──────────────────────────────────────────────
  {
    id: "dinner",
    icon: "restaurant-outline",
    name: "Dinner",
    color: "#EF4444",
    dim: "rgba(239,68,68,0.12)",
    category: "hangout",
    defaultTitle: "Dinner",
    hasSecret: false,
    datePlaceholder: "Reservation date",
    hint: "Split the bill without the awkward calculator",
  },
  {
    id: "game_night",
    icon: "game-controller-outline",
    name: "Game Night",
    color: "#8B5CF6",
    dim: "rgba(139,92,246,0.12)",
    category: "hangout",
    defaultTitle: "Game Night",
    hasSecret: false,
    datePlaceholder: "When?",
    hint: "Coordinate who's bringing what",
  },
  {
    id: "sports",
    icon: "trophy-outline",
    name: "Sports",
    color: "#14B8A6",
    dim: "rgba(20,184,166,0.12)",
    category: "hangout",
    defaultTitle: "Match Day",
    hasSecret: false,
    datePlaceholder: "Match date",
    hint: "Tickets, photos, and who owes who",
  },
];

export const CATEGORY_LABELS: Record<MomentTemplate["category"], string> = {
  celebrate: "Celebrations",
  travel:    "Travel",
  hangout:   "Hangouts",
  milestone: "Milestones",
};
