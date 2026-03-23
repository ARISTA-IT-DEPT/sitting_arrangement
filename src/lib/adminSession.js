const ADMIN_STORAGE_KEY = 'office-layout-admin-session.v1';

function getAdminCredentials() {
  return {
    username: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
    password: import.meta.env.VITE_ADMIN_PASSWORD || 'Arista@2014',
  };
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_STORAGE_KEY);
}

export async function fetchAdminSession() {
  const session = readStoredSession();

  if (!session?.isAdmin || typeof session.username !== 'string') {
    return {
      isAdmin: false,
      username: null,
      isConfigured: true,
    };
  }

  return {
    isAdmin: true,
    username: session.username,
    isConfigured: true,
  };
}

export async function loginAdmin(credentials) {
  const adminCredentials = getAdminCredentials();

  if (
    credentials?.username !== adminCredentials.username ||
    credentials?.password !== adminCredentials.password
  ) {
    throw new Error('Invalid username or password.');
  }

  const session = {
    isAdmin: true,
    username: adminCredentials.username,
  };

  writeStoredSession(session);
  return {
    ...session,
    isConfigured: true,
  };
}

export async function logoutAdmin() {
  clearStoredSession();
}
