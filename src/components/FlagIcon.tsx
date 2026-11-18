import { cn } from "@/lib/utils";

interface FlagIconProps {
  country: "UK" | "CN";
  className?: string;
}

export function FlagIcon({ country, className }: FlagIconProps) {
  if (country === "CN") {
    return (
      <svg
        viewBox="0 0 30 20"
        className={cn("h-3.5 w-5 rounded-[2px] shrink-0 ring-1 ring-black/10", className)}
        aria-hidden="true"
      >
        <rect width="30" height="20" fill="#DE2910" />
        {/* Large star */}
        <polygon
          points="5,2.2 5.7,4.3 7.9,4.3 6.1,5.6 6.8,7.7 5,6.4 3.2,7.7 3.9,5.6 2.1,4.3 4.3,4.3"
          fill="#FFDE00"
        />
        {/* Four small stars */}
        <circle cx="10" cy="2.3" r="0.85" fill="#FFDE00" />
        <circle cx="11.8" cy="4.2" r="0.85" fill="#FFDE00" />
        <circle cx="11.8" cy="6.8" r="0.85" fill="#FFDE00" />
        <circle cx="10" cy="8.7" r="0.85" fill="#FFDE00" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 60 30"
      className={cn("h-3.5 w-5 rounded-[2px] shrink-0 ring-1 ring-black/10 overflow-hidden", className)}
      aria-hidden="true"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="3.2" />
      <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
