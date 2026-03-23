import { Fragment } from 'react';
import DeskBlock from './DeskBlock';

const ROOM_TWO_COLUMNS = [
  {
    key: 'left',
    orientation: 'left',
    deskIds: ['BR-11', 'BR-10', 'BR-09', 'BR-08', 'BR-07', 'BR-06', 'BR-05', 'BR-04', 'BR-03', 'BR-02', 'BR-01'],
  },
  {
    key: 'middle',
    orientation: 'left',
    deskIds: ['BR-12', 'BR-13', 'BR-14', 'BR-15', 'BR-16', 'BR-17', 'BR-18', 'BR-19', 'BR-20', 'BR-21', null],
  },
  {
    key: 'right',
    orientation: 'right',
    deskIds: ['BR-32', 'BR-31', 'BR-30', 'BR-29', 'BR-28', 'BR-27', 'BR-26', 'BR-25', 'BR-24', 'BR-23', 'BR-22'],
  },
];

function WalkSpace({ variant }) {
  return (
    <div className={`room-two-walkspace room-two-walkspace--${variant}`} aria-hidden="true">
      <span className="room-two-walkspace__line" />
    </div>
  );
}

function RoomTwoPlan({ desks, onDeskClick, canEdit = true, activeDepartment = null }) {
  const deskMap = Object.fromEntries(desks.filter(Boolean).map((desk) => [desk.desk_id, desk]));

  return (
    <section className="floor-plan floor-plan--room2" aria-label="Room 2 floor plan">
      <div className="room-two-grid">
        {ROOM_TWO_COLUMNS.map((column, columnIndex) => (
          <Fragment key={column.key}>
            <div className={`room-two-column room-two-column--${column.key}`}>
              {column.deskIds.map((deskId, index) => {
                if (!deskId) {
                  return <div className="room-two-cell room-two-cell--empty" key={`${column.key}-${index}`} />;
                }

                const desk = deskMap[deskId];

                if (!desk) {
                  return <div className="room-two-cell room-two-cell--empty" key={deskId} />;
                }

                return (
                  <div className="room-two-cell" key={deskId}>
                    <DeskBlock
                      desk={desk}
                      orientation={column.orientation}
                      variant="room2"
                      activeDepartment={activeDepartment}
                      isEditable={canEdit}
                      onClick={canEdit ? () => onDeskClick(desk.desk_id) : undefined}
                    />
                  </div>
                );
              })}
            </div>
            {columnIndex < ROOM_TWO_COLUMNS.length - 1 ? <WalkSpace variant={column.key} /> : null}
          </Fragment>
        ))}
      </div>
      <footer className="room-two-footer b">Door</footer>
    </section>
  );
}

export default RoomTwoPlan;
