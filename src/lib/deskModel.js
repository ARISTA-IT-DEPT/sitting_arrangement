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

export const ROOM_ONE_ADDITIONAL_DESKS = [
  {
    desk_id: 'A-1',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    area: 'server-room',
  },
  {
    desk_id: 'A-2',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    area: 'himanshu-desk',
  },
  {
    desk_id: 'A-3',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    area: 'sumit-cabin',
  },
  {
    desk_id: 'A-4',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
    area: 'vishal-cabin',
  },
  {
    desk_id: 'A-5',
    employee: '',
    status: 'available',
    gender: '',
    department: '',
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
