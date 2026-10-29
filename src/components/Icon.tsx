export type IconName =
  | "arrow"
  | "play"
  | "pin"
  | "clock"
  | "instagram"
  | "menu"
  | "close"
  | "heart"
  | "music"
  | "book"
  | "hands"
  | "users"
  | "spark"
  | "share"
  | "refresh"
  | "check"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "volume"
  | "mute"

export default function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 5 7 7-7 7" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    menu: (
      <>
        <path d="M4 8h16" />
        <path d="M4 16h16" />
      </>
    ),
    close: (
      <>
        <path d="m5 5 14 14" />
        <path d="M19 5 5 19" />
      </>
    ),
    heart: <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />,
    music: (
      <>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
      </>
    ),
    hands: (
      <>
        <path d="M12 21c-4 0-7-3-7-7V9a1.5 1.5 0 0 1 3 0v3" />
        <path d="M8 12V5a1.5 1.5 0 0 1 3 0v6" />
        <path d="M11 11V4a1.5 1.5 0 0 1 3 0v7" />
        <path d="M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-3 7-5 7" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <path d="m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 4v7h-7" />
      </>
    ),
    check: <path d="m5 12 4.5 4.5L19 7" />,
    tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.8 2.2 4.6 5 5" />,
    facebook: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15V3Z" />,
    volume: (
      <>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
        <path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a7.8 7.8 0 0 1 0 11" />
      </>
    ),
    mute: (
      <>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
        <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
      </>
    ),
    youtube: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="m10 9 5 3-5 3V9Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

