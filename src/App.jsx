import { startTransition, useEffect, useState } from 'react';
import room2Source from './data/room1_desks.json';
import room1Source from './data/room2_desks.json';
import AdminLoginModal from './components/AdminLoginModal';
import EditDeskModal from './components/EditDeskModal';
import Legend from './components/Legend';
import PlanViewport from './components/PlanViewport';
import RoomOnePlan from './components/RoomOnePlan';
import RoomTwoPlan from './components/RoomTwoPlan';
import { fetchAdminSession, loginAdmin, logoutAdmin } from './lib/adminSession';
import { loadDeskDatabase, loadDeskDatabaseSnapshot, saveDeskDatabase } from './lib/deskDatabase';
import {
  buildShiftTimingOptions,
  createInitialRooms,
  DEPARTMENTS,
  isDefaultShiftTiming,
  normalizeShiftTiming,
  normalizeShiftTimingList,
} from './lib/deskModel';

const ROOM_TABS = [
  { key: 'room1', label: 'Room 1' },
  { key: 'room2', label: 'Room 2' },
];

const initialRooms = createInitialRooms(room1Source, room2Source);
const initialDeskState = loadDeskDatabaseSnapshot(initialRooms);

function App() {
  const [activeRoom, setActiveRoom] = useState('room1');
  const [deskState, setDeskState] = useState(() => initialDeskState);
  const [selectedDeskKey, setSelectedDeskKey] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedShiftTiming, setSelectedShiftTiming] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAdmin: false,
    username: null,
    isConfigured: true,
  });

  const rooms = deskState.rooms;
  const customShiftTimings = deskState.shiftTimings ?? [];
  const activeDesks = rooms[activeRoom];
  const activeDesk = selectedDeskKey
    ? activeDesks.find((desk) => desk?.desk_id === selectedDeskKey) ?? null
    : null;

  const occupiedCount = activeDesks.filter((desk) => desk?.status === 'occupied').length;
  const availableCount = activeDesks.filter((desk) => desk?.status === 'available').length;
  const maleCount = activeDesks.filter((desk) => desk?.status === 'occupied' && desk.gender === 'male').length;
  const femaleCount = activeDesks.filter((desk) => desk?.status === 'occupied' && desk.gender === 'female').length;
  const allDesks = Object.values(rooms).flat().filter(Boolean);
  const shiftTimingOptions = buildShiftTimingOptions(allDesks, customShiftTimings);
  const combinedOccupiedCount = allDesks.filter((desk) => desk.status === 'occupied').length;
  const combinedAvailableCount = allDesks.filter((desk) => desk.status === 'available').length;
  const combinedMaleCount = allDesks.filter((desk) => desk.status === 'occupied' && desk.gender === 'male').length;
  const combinedFemaleCount = allDesks.filter((desk) => desk.status === 'occupied' && desk.gender === 'female').length;

  const activeFilter = selectedDepartment
    ? { type: 'department', value: selectedDepartment }
    : selectedShiftTiming
      ? { type: 'shiftTiming', value: selectedShiftTiming }
      : null;

  const highlightedFilterCount = activeFilter
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          (activeFilter.type === 'department'
            ? desk.department === activeFilter.value
            : desk.shiftTiming === activeFilter.value),
      ).length
    : 0;

  const filterMaleCount = activeFilter
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          (activeFilter.type === 'department'
            ? desk.department === activeFilter.value
            : desk.shiftTiming === activeFilter.value) &&
          desk.gender === 'male',
      ).length
    : 0;

  const filterFemaleCount = activeFilter
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          (activeFilter.type === 'department'
            ? desk.department === activeFilter.value
            : desk.shiftTiming === activeFilter.value) &&
          desk.gender === 'female',
      ).length
    : 0;

  function handleRoomChange(roomKey) {
    startTransition(() => {
      setActiveRoom(roomKey);
      setSelectedDeskKey(null);
    });
  }

  function handleDeskOpen(deskId) {
    if (!authState.isAdmin) {
      setIsLoginOpen(true);
      return;
    }

    setSelectedDeskKey(deskId);
  }

  async function handleDeskSave(updatedDesk) {
    const nextRooms = {
      ...rooms,
      [activeRoom]: rooms[activeRoom].map((desk) => {
        if (!desk || desk.desk_id !== updatedDesk.desk_id) {
          return desk;
        }

        return {
          ...desk,
          employee: updatedDesk.employee.trim(),
          status: updatedDesk.status,
          gender: updatedDesk.gender,
          department: updatedDesk.department,
          shiftTiming: updatedDesk.shiftTiming,
        };
      }),
    };

    const nextDeskState = {
      rooms: nextRooms,
      shiftTimings: customShiftTimings,
    };

    setDeskState(nextDeskState);

    try {
      await saveDeskDatabase(nextDeskState);
      setSelectedDeskKey(null);
    } catch (error) {
      const latestDeskState = await loadDeskDatabase(initialRooms);
      setDeskState(latestDeskState);

      if (error instanceof Error && error.message.includes('Admin login required')) {
        setAuthState((previousState) => ({
          ...previousState,
          isAdmin: false,
          username: null,
        }));
        setIsLoginOpen(true);
      }

      throw error;
    }
  }

  async function handleShiftTimingCreate(shiftTimingInput) {
    const normalizedShiftTiming = normalizeShiftTiming(shiftTimingInput);

    if (!normalizedShiftTiming) {
      throw new Error('Enter a valid shift timing before adding it.');
    }

    if (shiftTimingOptions.includes(normalizedShiftTiming)) {
      return normalizedShiftTiming;
    }

    const nextDeskState = {
      rooms,
      shiftTimings: normalizeShiftTimingList([...customShiftTimings, normalizedShiftTiming]),
    };

    setDeskState(nextDeskState);

    try {
      await saveDeskDatabase(nextDeskState);
      return normalizedShiftTiming;
    } catch (error) {
      const latestDeskState = await loadDeskDatabase(initialRooms);
      setDeskState(latestDeskState);
      throw error;
    }
  }

  async function handleShiftTimingRemove(shiftTimingInput) {
    const normalizedShiftTiming = normalizeShiftTiming(shiftTimingInput);

    if (!normalizedShiftTiming) {
      throw new Error('Select a shift timing before removing it.');
    }

    if (isDefaultShiftTiming(normalizedShiftTiming)) {
      throw new Error('Default shift timings cannot be removed.');
    }

    const isAssignedToDesk = allDesks.some((desk) => desk.shiftTiming === normalizedShiftTiming);

    if (isAssignedToDesk) {
      throw new Error('This shift timing is assigned to one or more desks. Change those desks first.');
    }

    const nextDeskState = {
      rooms,
      shiftTimings: customShiftTimings.filter((shiftTiming) => shiftTiming !== normalizedShiftTiming),
    };

    setDeskState(nextDeskState);

    try {
      await saveDeskDatabase(nextDeskState);

      if (selectedShiftTiming === normalizedShiftTiming) {
        setSelectedShiftTiming(null);
      }

      return normalizedShiftTiming;
    } catch (error) {
      const latestDeskState = await loadDeskDatabase(initialRooms);
      setDeskState(latestDeskState);
      throw error;
    }
  }

  async function handleAdminLogin(credentials) {
    const session = await loginAdmin(credentials);
    setAuthState({
      isLoading: false,
      isAdmin: Boolean(session.isAdmin),
      username: session.username ?? 'admin',
      isConfigured: true,
    });
    setIsLoginOpen(false);
  }

  async function handleAdminLogout() {
    await logoutAdmin();
    setAuthState((previousState) => ({
      ...previousState,
      isAdmin: false,
      username: null,
    }));
    setSelectedDeskKey(null);
  }

  useEffect(() => {
    let isCancelled = false;

    async function hydrateApp() {
      const [storedDeskState, session] = await Promise.all([
        loadDeskDatabase(initialRooms),
        fetchAdminSession().catch(() => ({
          isAdmin: false,
          username: null,
          isConfigured: false,
        })),
      ]);

      if (!isCancelled) {
        setDeskState(storedDeskState);
        setAuthState({
          isLoading: false,
          isAdmin: Boolean(session.isAdmin),
          username: session.username ?? null,
          isConfigured: session.isConfigured ?? true,
        });
      }
    }

    void hydrateApp();

    return () => {
      isCancelled = true;
    };
  }, []);

  const headerSubtitle = authState.isAdmin
    ? `Admin mode active${authState.username ? ` for ${authState.username}` : ''}. Click any desk to edit and save shared seating changes.`
    : 'View-only mode is active. Admin login is required before any desk changes can be saved.';

  const filterPanelSubtitle = activeFilter
    ? `${highlightedFilterCount} occupied desk${highlightedFilterCount === 1 ? '' : 's'} highlighted in ${ROOM_TABS.find((room) => room.key === activeRoom)?.label ?? activeRoom}.`
    : 'Choose either a department filter or a shift timing filter. Selecting one clears the other.';

  function handleDepartmentFilterChange(event) {
    const nextDepartment = event.target.value || null;
    setSelectedDepartment(nextDepartment);

    if (nextDepartment) {
      setSelectedShiftTiming(null);
    }
  }

  function handleShiftTimingFilterChange(event) {
    const nextShiftTiming = event.target.value || null;
    setSelectedShiftTiming(nextShiftTiming);

    if (nextShiftTiming) {
      setSelectedDepartment(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__title-group">
          <p className="app-header__eyebrow">Top-down floor plan editor</p>
          <h1>Office Desk Layout Editor</h1>
          <p className="app-header__subtitle">{headerSubtitle}</p>
        </div>

        <nav className="room-tabs" aria-label="Room navigation">
          {ROOM_TABS.map((room) => (
            <button
              key={room.key}
              type="button"
              className={`room-tab${activeRoom === room.key ? ' room-tab--active' : ''}`}
              onClick={() => handleRoomChange(room.key)}
            >
              {room.label}
            </button>
          ))}
        </nav>

        <section className="access-panel" aria-label="Admin access">
          <p className="access-panel__eyebrow">Access</p>
          <div className="access-panel__body">
            <div className="access-panel__status">
              <span className={`access-panel__badge${authState.isAdmin ? ' access-panel__badge--admin' : ''}`}>
                {authState.isLoading ? 'Checking' : authState.isAdmin ? 'Admin' : 'View Only'}
              </span>
              <p className="access-panel__text">
                {authState.isAdmin
                  ? 'You can edit and save shared desk assignments.'
                  : authState.isConfigured
                    ? 'Layout is visible to everyone, but only admin can make changes.'
                    : 'Admin login is not configured on the server yet.'}
              </p>
            </div>
            {authState.isAdmin ? (
              <button type="button" className="button button--ghost access-panel__action" onClick={handleAdminLogout}>
                Logout
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary access-panel__action"
                onClick={() => setIsLoginOpen(true)}
                disabled={authState.isLoading}
              >
                Admin Login
              </button>
            )}
          </div>
        </section>

        <Legend
          roomLabel={ROOM_TABS.find((room) => room.key === activeRoom)?.label ?? activeRoom}
          occupiedCount={occupiedCount}
          availableCount={availableCount}
          combinedOccupiedCount={combinedOccupiedCount}
          combinedAvailableCount={combinedAvailableCount}
          maleCount={maleCount}
          femaleCount={femaleCount}
          combinedMaleCount={combinedMaleCount}
          combinedFemaleCount={combinedFemaleCount}
        />
      </header>

      <main className="plan-stage">
        <aside className="department-panel" aria-label="Desk filters">
          <div className="department-panel__header">
            <p className="department-panel__eyebrow">Filters</p>
            <h2>Highlight Desks</h2>
            <p className="department-panel__subtitle">{filterPanelSubtitle}</p>
          </div>

          <div className="department-panel__body">
            <label className="filter-field">
              <span>Department Filter</span>
              <select
                className="department-select input"
                value={selectedDepartment || ''}
                onChange={handleDepartmentFilterChange}
                aria-label="Select department to highlight"
              >
                <option value="">-- No Department Filter --</option>
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Shift Timing Filter</span>
              <select
                className="department-select input"
                value={selectedShiftTiming || ''}
                onChange={handleShiftTimingFilterChange}
                aria-label="Select shift timing to highlight"
              >
                <option value="">-- No Shift Timing Filter --</option>
                {shiftTimingOptions.map((shiftTiming) => (
                  <option key={shiftTiming} value={shiftTiming}>
                    {shiftTiming}
                  </option>
                ))}
              </select>
            </label>

            {activeFilter && (
              <div className="department-metrics">
                <p className="department-metrics__title">
                  {activeFilter.type === 'department' ? 'Department' : 'Shift Timing'} Stats
                </p>
                <p className="department-metrics__name">{activeFilter.value}</p>
                <div className="department-metrics__grid">
                  <div className="department-metrics__stat department-metrics__stat--total">
                    <span className="department-metrics__label">Total</span>
                    <strong className="department-metrics__value">{highlightedFilterCount}</strong>
                  </div>
                  <div className="department-metrics__stat department-metrics__stat--male">
                    <span className="department-metrics__label">Male</span>
                    <strong className="department-metrics__value">{filterMaleCount}</strong>
                  </div>
                  <div className="department-metrics__stat department-metrics__stat--female">
                    <span className="department-metrics__label">Female</span>
                    <strong className="department-metrics__value">{filterFemaleCount}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="plan-stage__canvas">
          <PlanViewport key={activeRoom} roomKey={activeRoom}>
            {activeRoom === 'room1' ? (
              <RoomOnePlan
                desks={activeDesks}
                onDeskClick={handleDeskOpen}
                canEdit={authState.isAdmin}
                activeFilter={activeFilter}
              />
            ) : (
              <RoomTwoPlan
                desks={activeDesks}
                onDeskClick={handleDeskOpen}
                canEdit={authState.isAdmin}
                activeFilter={activeFilter}
              />
            )}
          </PlanViewport>
        </div>
      </main>

      {activeDesk ? (
        <EditDeskModal
          key={activeDesk.desk_id}
          desk={activeDesk}
          roomLabel={ROOM_TABS.find((room) => room.key === activeRoom)?.label ?? activeRoom}
          shiftTimingOptions={shiftTimingOptions}
          customShiftTimings={customShiftTimings}
          onAddShiftTiming={handleShiftTimingCreate}
          onRemoveShiftTiming={handleShiftTimingRemove}
          onClose={() => setSelectedDeskKey(null)}
          onSave={handleDeskSave}
        />
      ) : null}

      {isLoginOpen ? (
        <AdminLoginModal
          isConfigured={authState.isConfigured}
          onClose={() => setIsLoginOpen(false)}
          onLogin={handleAdminLogin}
        />
      ) : null}
    </div>
  );
}

export default App;
