function DeskGlyph({ status }) {
  return (
    <span className={`desk-glyph desk-glyph--${status}`} aria-hidden="true">
      <span className="desk-glyph__desk-surface" />
      <span className="desk-glyph__notebook" />
      <span className="desk-glyph__cup" />
      <span className="desk-glyph__cup-handle" />
      <span className="desk-glyph__monitor-stand" />
      <span className="desk-glyph__monitor">
        <span className="desk-glyph__screen" />
      </span>
      <span className="desk-glyph__keyboard">
        <span className="desk-glyph__keys" />
      </span>
      <span className="desk-glyph__mouse" />
      <span className="desk-glyph__chair">
        <span className="desk-glyph__chair-back" />
        <span className="desk-glyph__chair-seat" />
        <span className="desk-glyph__armrest desk-glyph__armrest--left" />
        <span className="desk-glyph__armrest desk-glyph__armrest--right" />
      </span>
      <span className="desk-glyph__employee">
        <span className="desk-glyph__shoulders" />
        <span className="desk-glyph__head" />
      </span>
    </span>
  );
}

function DeskBlock({
  desk,
  orientation = 'right',
  variant = 'room1',
  onClick,
  isEditable = true,
  activeDepartment = null,
}) {
  const employeeLabel = desk.employee.trim() || (desk.status === 'available' ? 'Available' : 'Unassigned');
  const genderClass = desk.gender === 'female' ? ' desk-card--female' : desk.gender === 'male' ? ' desk-card--male' : '';
  const isDepartmentMatch =
    Boolean(activeDepartment) &&
    desk.status === 'occupied' &&
    desk.employee.trim() &&
    desk.department === activeDepartment;
  const departmentClass = activeDepartment
    ? isDepartmentMatch
      ? ' desk-card--department-match'
      : ' desk-card--department-dim'
    : '';

  return (
    <button
      type="button"
      className={`desk-card desk-card--${variant} desk-card--${orientation} desk-card--${desk.status}${genderClass}${departmentClass}${isEditable ? '' : ' desk-card--static'}`}
      onClick={onClick}
      disabled={!isEditable}
      title={`${desk.desk_id} - ${employeeLabel}${desk.department ? ` (${desk.department})` : ''}`}
    >
      <span className="desk-card__content">
        <span className="desk-card__meta">
          <span className="desk-card__id">{desk.desk_id}</span>
          <span className="desk-card__name">{employeeLabel}</span>
          <span className="desk-card__markers" aria-hidden="true">
            <span className={`desk-card__dot desk-card__dot--${desk.status}`} />
            {desk.gender ? <span className={`desk-card__dot desk-card__dot--${desk.gender}`} /> : null}
          </span>
        </span>
        <span className="desk-card__station" aria-hidden="true">
          <span className="desk-card__status" />
          <DeskGlyph status={desk.status} />
        </span>
      </span>
    </button>
  );
}

export default DeskBlock;
