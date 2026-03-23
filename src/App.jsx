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
import { createInitialRooms, DEPARTMENTS } from './lib/deskModel';

const ROOM_TABS = [
  { key: 'room1', label: 'Room 1' },
  { key: 'room2', label: 'Room 2' },
];

const initialRooms = createInitialRooms(room1Source, room2Source);

function App() {
  const [activeRoom, setActiveRoom] = useState('room1');
  const [rooms, setRooms] = useState(() => loadDeskDatabaseSnapshot(initialRooms));
  const [selectedDeskKey, setSelectedDeskKey] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAdmin: false,
    username: null,
    isConfigured: true,
  });

  const activeDesks = rooms[activeRoom];
  const activeDesk = selectedDeskKey
    ? activeDesks.find((desk) => desk?.desk_id === selectedDeskKey) ?? null
    : null;

  const occupiedCount = activeDesks.filter((desk) => desk?.status === 'occupied').length;
  const availableCount = activeDesks.filter((desk) => desk?.status === 'available').length;
  const maleCount = activeDesks.filter((desk) => desk?.status === 'occupied' && desk.gender === 'male').length;
  const femaleCount = activeDesks.filter((desk) => desk?.status === 'occupied' && desk.gender === 'female').length;
  const allDesks = Object.values(rooms).flat().filter(Boolean);
  const combinedOccupiedCount = allDesks.filter((desk) => desk.status === 'occupied').length;
  const combinedAvailableCount = allDesks.filter((desk) => desk.status === 'available').length;
  const combinedMaleCount = allDesks.filter((desk) => desk.status === 'occupied' && desk.gender === 'male').length;
  const combinedFemaleCount = allDesks.filter((desk) => desk.status === 'occupied' && desk.gender === 'female').length;
  const highlightedDepartmentCount = selectedDepartment
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          desk.department === selectedDepartment,
      ).length
    : 0;

  const departmentMaleCount = selectedDepartment
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          desk.department === selectedDepartment &&
          desk.gender === 'male',
      ).length
    : 0;

  const departmentFemaleCount = selectedDepartment
    ? activeDesks.filter(
        (desk) =>
          desk?.status === 'occupied' &&
          desk.employee.trim() &&
          desk.department === selectedDepartment &&
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
        };
      }),
    };

    setRooms(nextRooms);

    try {
      await saveDeskDatabase(nextRooms);
      setSelectedDeskKey(null);
    } catch (error) {
      const latestRooms = await loadDeskDatabase(initialRooms);
      setRooms(latestRooms);

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
      const [storedRooms, session] = await Promise.all([
        loadDeskDatabase(initialRooms),
        fetchAdminSession().catch(() => ({
          isAdmin: false,
          username: null,
          isConfigured: false,
        })),
      ]);

      if (!isCancelled) {
        setRooms(storedRooms);
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

  const departmentPanelSubtitle = selectedDepartment
    ? `${highlightedDepartmentCount} occupied desk${highlightedDepartmentCount === 1 ? '' : 's'} highlighted in ${ROOM_TABS.find((room) => room.key === activeRoom)?.label ?? activeRoom}.`
    : 'Select a department below to highlight it on the floor plan.';

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
        <aside className="department-panel" aria-label="Department filters">
          <div className="department-panel__header">
            <p className="department-panel__eyebrow">Departments</p>
            <h2>Highlight By Team</h2>
            <p className="department-panel__subtitle">{departmentPanelSubtitle}</p>
          </div>

          <div className="department-panel__body">
            <select
              className="department-select input"
              value={selectedDepartment || ''}
              onChange={(e) => setSelectedDepartment(e.target.value || null)}
              aria-label="Select department to highlight"
            >
              <option value="">-- No Department Filter --</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            {selectedDepartment && (
              <div className="department-metrics">
                <p className="department-metrics__title">{selectedDepartment} Stats</p>
                <div className="department-metrics__grid">
                  <div className="department-metrics__stat department-metrics__stat--total">
                    <span className="department-metrics__label">Total</span>
                    <strong className="department-metrics__value">{highlightedDepartmentCount}</strong>
                  </div>
                  <div className="department-metrics__stat department-metrics__stat--male">
                    <span className="department-metrics__label">Male</span>
                    <strong className="department-metrics__value">{departmentMaleCount}</strong>
                  </div>
                  <div className="department-metrics__stat department-metrics__stat--female">
                    <span className="department-metrics__label">Female</span>
                    <strong className="department-metrics__value">{departmentFemaleCount}</strong>
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
                activeDepartment={selectedDepartment}
              />
            ) : (
              <RoomTwoPlan
                desks={activeDesks}
                onDeskClick={handleDeskOpen}
                canEdit={authState.isAdmin}
                activeDepartment={selectedDepartment}
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
