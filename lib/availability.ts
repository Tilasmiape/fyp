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
