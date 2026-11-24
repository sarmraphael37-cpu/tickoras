/**
 * Social destinations. Values are overridable per deployment; the defaults are
 * platform search pages so the footer never claims an official account that
 * has not been verified.
 */
export const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
      "https://www.instagram.com/explore/search/keyword/?q=tickora",
  },
  {
    label: "X",
    href: process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/search?q=TICKORA",
  },
  {
    label: "Facebook",
    href:
      process.env.NEXT_PUBLIC_FACEBOOK_URL ??
      "https://www.facebook.com/search/top?q=tickora",
  },
  {
    label: "LinkedIn",
    href:
      process.env.NEXT_PUBLIC_LINKEDIN_URL ??
      "https://www.linkedin.com/search/results/all/?keywords=TICKORA",
  },
] as const;
