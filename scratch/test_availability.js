// Mocked logic from lib/availability.ts for verification
const TIME_SLOT_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

function toDateTime(dateStr, timeStr) {
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

function isFutureSlot(dateStr, timeStr, bufferHours = 0, now) {
  const slotDate = toDateTime(dateStr, timeStr);
  if (!slotDate) return false;
  
  const compareDate = new Date(now.getTime() + bufferHours * 60 * 60 * 1000);
  
  return slotDate > compareDate;
}

function getFutureAvailability(availability, bufferHours = 0, now) {
  const result = [];
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const dateEntry of availability) {
    const dateOnly = new Date(`${dateEntry.date}T00:00:00`);
    if (Number.isNaN(dateOnly.getTime())) continue;
    if (dateOnly < todayStart) continue;

    const futureSlots = dateEntry.timeSlots.filter(slot => 
      isFutureSlot(dateEntry.date, slot.time, bufferHours, now)
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

// Mock current time: April 16, 2026, 10:00 AM
const mockNow = new Date('2026-04-16T10:00:00');
const testDate = '2026-04-16';

console.log('--- Test 1: Past Slot ---');
console.log('09:00 AM (expected false):', isFutureSlot(testDate, '09:00 AM', 5, mockNow)); 

console.log('\n--- Test 2: Near-Future Slot (within 5h) ---');
console.log('11:00 AM (expected false):', isFutureSlot(testDate, '11:00 AM', 5, mockNow)); 
console.log('02:00 PM (expected false):', isFutureSlot(testDate, '02:00 PM', 5, mockNow)); 
console.log('03:00 PM (expected false):', isFutureSlot(testDate, '03:00 PM', 5, mockNow)); // 10am + 5h = 3pm (exclusive if >)

console.log('\n--- Test 3: Future Slot (> 5h) ---');
console.log('04:00 PM (expected true):', isFutureSlot(testDate, '04:00 PM', 5, mockNow)); 

console.log('\n--- Test 4: Next Day Slot ---');
console.log('Next Day 09:00 AM (expected true):', isFutureSlot('2026-04-17', '09:00 AM', 5, mockNow)); 

const sampleAvailability = [
  {
    date: '2026-04-15', // Past date
    timeSlots: [{ time: '10:00 AM', duration: 60 }]
  },
  {
    date: '2026-04-16', // Today
    timeSlots: [
      { time: '09:00 AM', duration: 60 }, // Past
      { time: '12:00 PM', duration: 60 }, // Within 5h
      { time: '04:00 PM', duration: 60 }  // Valid (>5h)
    ]
  },
  {
    date: '2026-04-17', // Future date
    timeSlots: [{ time: '10:00 AM', duration: 60 }]
  }
];

console.log('\n--- Test 5: getFutureAvailability ---');
const filtered = getFutureAvailability(sampleAvailability, 5, mockNow);
console.log(JSON.stringify(filtered, null, 2));
