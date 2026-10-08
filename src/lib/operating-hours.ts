export interface OperatingHoursInfo {
  isOutside: boolean;
  isClosedDay: boolean;
  displayHours: string;
  displayDays: string;
  startHourDisplay: string;
  nextOpenDayNotice: string;
}

/**
 * Returns dynamic operating hours info based on .env configuration,
 * evaluated against Malaysian local time (Asia/Kuala_Lumpur).
 */
export function getOperatingHoursInfo(): OperatingHoursInfo {
  const startHour = Number(process.env.NEXT_PUBLIC_OPERATING_HOUR_START ?? 9);
  const endHour = Number(process.env.NEXT_PUBLIC_OPERATING_HOUR_END ?? 19);
  const displayHours = process.env.NEXT_PUBLIC_OPERATING_HOURS_DISPLAY ?? "9:00 AM – 7:00 PM";
  const displayDays = process.env.NEXT_PUBLIC_OPERATING_DAYS_DESCRIPTION ?? "Mon – Sat";
  const closedDaysRaw = process.env.NEXT_PUBLIC_CLOSED_DAYS ?? "0";
  const closedDays = closedDaysRaw
    ? closedDaysRaw
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((n) => !isNaN(n))
    : [];

  const now = new Date();

  // Current hour in Asia/Kuala_Lumpur (0-23)
  const currentHourMYT = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "numeric",
      hour12: false,
    }).format(now)
  );

  // Current weekday in Asia/Kuala_Lumpur (0=Sun, 1=Mon, ..., 6=Sat)
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
  }).format(now);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDayOfWeek = dayMap[dayStr] ?? now.getDay();

  const isClosedDay = closedDays.includes(currentDayOfWeek);
  const isOutsideHours = currentHourMYT < startHour || currentHourMYT >= endHour;
  const isOutside = isClosedDay || isOutsideHours;

  // Format startHour nicely (e.g. 9 -> "9:00 AM")
  const startHourDate = new Date();
  startHourDate.setHours(startHour, 0, 0, 0);
  const startHourDisplay = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startHourDate);

  let nextOpenDayNotice = `tomorrow at ${startHourDisplay}`;
  if (isClosedDay) {
    nextOpenDayNotice = `on the next working day at ${startHourDisplay}`;
  } else if (currentHourMYT < startHour) {
    nextOpenDayNotice = `this morning at ${startHourDisplay}`;
  }

  return {
    isOutside,
    isClosedDay,
    displayHours,
    displayDays,
    startHourDisplay,
    nextOpenDayNotice,
  };
}
