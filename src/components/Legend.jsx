function Legend({
  roomLabel,
  occupiedCount,
  availableCount,
  combinedOccupiedCount,
  combinedAvailableCount,
  maleCount,
  femaleCount,
  combinedMaleCount,
  combinedFemaleCount,
}) {
  return (
    <section className="legend" aria-label={`${roomLabel} desk summary`}>
      <div className="legend__group">
        <p className="legend__title">{roomLabel}</p>
        <div className="legend__stats">
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--occupied" aria-hidden="true" />
            <span className="legend__label">Occupied</span>
            <strong className="legend__value">{occupiedCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--available" aria-hidden="true" />
            <span className="legend__label">Available</span>
            <strong className="legend__value">{availableCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--male" aria-hidden="true" />
            <span className="legend__label">Male</span>
            <strong className="legend__value">{maleCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--female" aria-hidden="true" />
            <span className="legend__label">Female</span>
            <strong className="legend__value">{femaleCount}</strong>
          </div>
        </div>
      </div>

      <div className="legend__group">
        <p className="legend__title">All Rooms Combined</p>
        <div className="legend__stats">
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--occupied" aria-hidden="true" />
            <span className="legend__label">Occupied</span>
            <strong className="legend__value">{combinedOccupiedCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--available" aria-hidden="true" />
            <span className="legend__label">Available</span>
            <strong className="legend__value">{combinedAvailableCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--male" aria-hidden="true" />
            <span className="legend__label">Male</span>
            <strong className="legend__value">{combinedMaleCount}</strong>
          </div>
          <div className="legend__stat">
            <span className="legend__swatch legend__swatch--female" aria-hidden="true" />
            <span className="legend__label">Female</span>
            <strong className="legend__value">{combinedFemaleCount}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Legend;
