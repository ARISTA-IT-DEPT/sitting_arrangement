export const DEPARTMENTS = [
  'Technology & Development',
  'E-commerce Operations',
  'E-Commerce Content & Catalog',
  'Digital Marketing',
  'Design & Creative',
  'Customer Service - Kith',
  'Customer Service - Craighill',
  'Amazon',
  'Content Management',
  'Web Operations',
  'Project Coordination',
  'Human Resources',
  'Management',
];

export const DEFAULT_SHIFT_TIMINGS = [
  '11:00 AM - 8:00 PM',
  '12:00 PM - 9:00 PM',
  '12:30 PM - 9:30 PM',
  '1:00 PM - 10:00 PM',
  '2:00 PM - 11:00 PM',
  '2:30 PM - 11:30 PM',
  '3:00 PM - 12:00 AM',
  '7:00 PM - 4:00 AM',
  '8:00 PM - 5:00 AM',
];

export const ROOM_ONE_ADDITIONAL_DESKS = [
  {
    desk_id: 'A-1',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    shiftTiming: '',
    area: 'server-room',
  },
  {
    desk_id: 'A-2',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    shiftTiming: '',
    area: 'himanshu-desk',
  },
  {
    desk_id: 'A-3',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    shiftTiming: '',
    area: 'sumit-cabin',
  },
  {
    desk_id: 'A-4',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    shiftTiming: '',
    area: 'vishal-cabin',
  },
  {
    desk_id: 'A-5',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    shiftTiming: '',
    area: 'hr-cabin',
  },
];

function normalizeDepartment(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  return DEPARTMENTS.includes(trimmedValue) ? trimmedValue : '';
}

function normalizeGender(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim().toLowerCase();
  return trimmedValue === 'female' || trimmedValue === 'male' ? trimmedValue : '';
}

function formatShiftHour(rawHour) {
  const numericHour = Number(rawHour);

  if (!Number.isFinite(numericHour)) {
    return rawHour;
  }

  const normalizedHour = numericHour % 12 || 12;
  return String(normalizedHour);
}

export function normalizeShiftTiming(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const withoutPolicyPrefix = trimmedValue.replace(/^Policy\s+[A-Za-z]+\s*:\s*/i, '');
  const compactValue = withoutPolicyPrefix.replace(/\s+/g, ' ').trim();
  const match = compactValue.match(
    /^(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)$/i,
  );

  if (!match) {
    return compactValue;
  }

  const [, startHour, startMinute, startSuffix, endHour, endMinute, endSuffix] = match;

  return `${formatShiftHour(startHour)}:${startMinute} ${startSuffix.toUpperCase()} - ${formatShiftHour(endHour)}:${endMinute} ${endSuffix.toUpperCase()}`;
}

export function normalizeShiftTimingList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  const uniqueValues = new Set();

  values.forEach((value) => {
    const normalizedValue = normalizeShiftTiming(value);

    if (normalizedValue) {
      uniqueValues.add(normalizedValue);
    }
  });

  return [...uniqueValues];
}

export function isDefaultShiftTiming(value) {
  const normalizedValue = normalizeShiftTiming(value);
  return DEFAULT_SHIFT_TIMINGS.includes(normalizedValue);
}

export function buildShiftTimingOptions(desks = [], extraShiftTimings = []) {
  const options = new Set(DEFAULT_SHIFT_TIMINGS);

  normalizeShiftTimingList(extraShiftTimings).forEach((shiftTiming) => {
    options.add(shiftTiming);
  });

  desks.forEach((desk) => {
    const shiftTiming = normalizeShiftTiming(desk?.shiftTiming ?? desk?.shift_timing ?? desk?.shift);

    if (shiftTiming) {
      options.add(shiftTiming);
    }
  });

  return [...options];
}

export function normalizeDesk(desk) {
  if (!desk || typeof desk !== 'object') {
    return null;
  }

  return {
    ...desk,
    employee: typeof desk.employee === 'string' ? desk.employee : '',
    status: desk.status === 'occupied' ? 'occupied' : 'available',
    gender: normalizeGender(desk.gender),
    department: normalizeDepartment(desk.department),
    shiftTiming: normalizeShiftTiming(desk.shiftTiming ?? desk.shift_timing ?? desk.shift),
  };
}

export function withRoomOneAdditionalDesks(roomOneDesks) {
  const normalizedDesks = Array.isArray(roomOneDesks) ? roomOneDesks.map(normalizeDesk) : [];
  const baseDesks = normalizedDesks.filter((desk) => !desk || !desk.desk_id.startsWith('A-'));
  const persistedExtras = new Map(
    normalizedDesks
      .filter((desk) => desk && desk.desk_id.startsWith('A-'))
      .map((desk) => [desk.desk_id, desk]),
  );

  const additionalDesks = ROOM_ONE_ADDITIONAL_DESKS.map((desk) =>
    normalizeDesk({
      ...desk,
      ...(persistedExtras.get(desk.desk_id) ?? {}),
    }),
  );

  return [...baseDesks, ...additionalDesks];
}

export function createInitialRooms(roomOneSource, roomTwoSource) {
  return {
    room1: withRoomOneAdditionalDesks(roomOneSource),
    room2: Array.isArray(roomTwoSource) ? roomTwoSource.map(normalizeDesk) : [],
  };
}
