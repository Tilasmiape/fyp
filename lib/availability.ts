export const DEFAULT_TIME_SLOTS = [
  { time: '10:00 AM', duration: 60 },
  { time: '11:30 AM', duration: 60 },
  { time: '02:00 PM', duration: 60 },
  { time: '04:30 PM', duration: 60 }
] as const;

export const TIME_SLOT_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

export function isValidTimeSlot(time: string): boolean {
  if (!time) return false;
  return TIME_SLOT_REGEX.test(time.trim());
}

export function formatTimeSlot(time: string): string | null {
  if (!isValidTimeSlot(time)) return null;
  const cleaned = time.trim().toUpperCase().replace(/\s+/g, ''); // e.g. "9:00AM"
  const ampm = cleaned.slice(-2);
  const timeStr = cleaned.slice(0, -2);
  const [hour, minute] = timeStr.split(':');
  return `${hour.padStart(2, '0')}:${minute} ${ampm}`;
}

export interface AvailabilitySlot {
  time: string;
  duration: number;
}

export interface DateAvailability {
  date: string; // YYYY-MM-DD format
  timeSlots: AvailabilitySlot[];
}

export function normalizeAvailability(input: unknown): DateAvailability[] {
  if (!Array.isArray(input)) return [];
  const result: DateAvailability[] = [];

  for (const item of input) {
    if (typeof item === 'object' && item !== null && 'date' in item && 'timeSlots' in item) {
      // Handle new date-specific format
      const dateAvailability: DateAvailability = {
        date: String(item.date || '').trim(),
        timeSlots: normalizeTimeSlots(item.timeSlots)
      };
      if (dateAvailability.date.length > 0) {
        result.push(dateAvailability);
      }
    } else if (Array.isArray(item) && item.length > 0 && typeof item[0] === 'object' && 'time' in item[0]) {
      // Handle legacy time slots array - convert to today's date
      const today = new Date().toISOString().split('T')[0];
      const dateAvailability: DateAvailability = {
        date: today,
        timeSlots: normalizeTimeSlots(item)
      };
      if (dateAvailability.timeSlots.length > 0) {
        result.push(dateAvailability);
      }
    }
  }
  return result;
}

function normalizeTimeSlots(input: unknown): AvailabilitySlot[] {
  if (!Array.isArray(input)) return [];
  const result: AvailabilitySlot[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    if (typeof item === 'string') {
      // Handle legacy string format
      const slot: AvailabilitySlot = { time: item.trim(), duration: 60 };
      const key = `${slot.time}-${slot.duration}`;
      if (!seen.has(key) && slot.time.length > 0) {
        seen.add(key);
        result.push(slot);
      }
    } else if (typeof item === 'object' && item !== null && 'time' in item && 'duration' in item) {
      // Handle new object format
      const slot: AvailabilitySlot = {
        time: String(item.time || '').trim(),
        duration: Number(item.duration) || 60
      };
      const key = `${slot.time}-${slot.duration}`;
      if (!seen.has(key) && slot.time.length > 0) {
        seen.add(key);
        result.push(slot);
      }
    }
  }
  return result;
}

export function resolveAvailability(input: unknown): DateAvailability[] {
  const normalized = normalizeAvailability(input);
  return normalized.length > 0 ? normalized : [];
}

export function getAvailabilityForDate(availability: DateAvailability[], targetDate: string): AvailabilitySlot[] {
  const dateEntry = availability.find(entry => entry.date === targetDate);
  return dateEntry ? dateEntry.timeSlots : [];
}

export function validateAvailabilityTimes(input: unknown): { valid: DateAvailability[]; invalid: string[] } {
  const normalized = normalizeAvailability(input);
  const valid: DateAvailability[] = [];
  const invalid: string[] = [];

  for (const dateEntry of normalized) {
    const validTimeSlots: AvailabilitySlot[] = [];
    const invalidTimeSlots: string[] = [];

    for (const slot of dateEntry.timeSlots) {
      if (isValidTimeSlot(slot.time) && slot.duration >= 15 && slot.duration <= 180) {
        const formattedTime = formatTimeSlot(slot.time);
        if (formattedTime) {
          validTimeSlots.push({ time: formattedTime, duration: slot.duration });
        } else {
          invalidTimeSlots.push(`${slot.time} (invalid format)`);
        }
      } else {
        invalidTimeSlots.push(`${slot.time} (${slot.duration}min - duration must be 15-180 minutes)`);
      }
    }

    if (validTimeSlots.length > 0) {
      valid.push({
        date: dateEntry.date,
        timeSlots: validTimeSlots
      });
    }

    if (invalidTimeSlots.length > 0) {
      invalid.push(`Date ${dateEntry.date}: ${invalidTimeSlots.join(', ')}`);
    }
  }
  return { valid, invalid };
}
export function toDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
  const match24 = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  
  if (!match12 && !match24) return null;
  
  let hour = 0;
  let minute = 0;
  
  if (match12) {
    hour = parseInt(match12[1], 10);
    minute = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  } else if (match24) {
    hour = parseInt(match24[1], 10);
    minute = parseInt(match24[2], 10);
  }
  
  // Use YYYY-MM-DDT00:00:00 format to avoid timezone issues when only date is provided
  const dt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

export function isFutureSlot(dateStr: string, timeStr: string, bufferHours: number = 0): boolean {
  const slotDate = toDateTime(dateStr, timeStr);
  if (!slotDate) return false;
  
  const now = new Date();
  const compareDate = new Date(now.getTime() + bufferHours * 60 * 60 * 1000);
  
  return slotDate > compareDate;
}

export function getFutureAvailability(availability: DateAvailability[], bufferHours: number = 0): DateAvailability[] {
  const result: DateAvailability[] = [];
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const dateEntry of availability) {
    const dateOnly = new Date(`${dateEntry.date}T00:00:00`);
    if (Number.isNaN(dateOnly.getTime())) continue;
    if (dateOnly < todayStart) continue;

    const futureSlots = dateEntry.timeSlots.filter(slot => 
      isFutureSlot(dateEntry.date, slot.time, bufferHours)
    );

    if (futureSlots.length > 0) {
      result.push({
        ...dateEntry,
        timeSlots: futureSlots
      });
    }
  }
  
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
