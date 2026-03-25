import { useEffect, useEffectEvent, useState } from 'react';
import { DEPARTMENTS } from '../lib/deskModel';

function EditDeskModal({
  desk,
  roomLabel,
  shiftTimingOptions,
  customShiftTimings,
  onAddShiftTiming,
  onRemoveShiftTiming,
  onClose,
  onSave,
}) {
  const [formState, setFormState] = useState(() => ({
    employee: desk.employee,
    status: desk.status,
    gender: desk.gender ?? '',
    department: desk.department ?? '',
    shiftTiming: desk.shiftTiming ?? '',
  }));
  const [newShiftTiming, setNewShiftTiming] = useState('');
  const [shiftTimingToRemove, setShiftTimingToRemove] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingShiftOptions, setIsUpdatingShiftOptions] = useState(false);

  const closeOnEscape = useEffectEvent((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  });

  useEffect(() => {
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormState((previousState) => ({
      ...previousState,
      [name]: value,
    }));
    setErrorMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSave({
        ...desk,
        ...formState,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save desk changes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddShiftTiming() {
    setIsUpdatingShiftOptions(true);
    setErrorMessage('');

    try {
      const normalizedShiftTiming = await onAddShiftTiming(newShiftTiming);
      setFormState((previousState) => ({
        ...previousState,
        shiftTiming: normalizedShiftTiming,
      }));
      setNewShiftTiming('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add shift timing.');
    } finally {
      setIsUpdatingShiftOptions(false);
    }
  }

  async function handleRemoveShiftTiming() {
    setIsUpdatingShiftOptions(true);
    setErrorMessage('');

    try {
      const removedShiftTiming = await onRemoveShiftTiming(shiftTimingToRemove);

      if (formState.shiftTiming === removedShiftTiming) {
        setFormState((previousState) => ({
          ...previousState,
          shiftTiming: '',
        }));
      }

      setShiftTimingToRemove('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove shift timing.');
    } finally {
      setIsUpdatingShiftOptions(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="desk-editor-title">
        <header className="modal-card__header">
          <div className="modal-card__title-group">
            <p className="modal-card__eyebrow">{roomLabel}</p>
            <h2 id="desk-editor-title">Edit Desk {desk.desk_id}</h2>
            <p className="modal-card__subnote">Changes are saved for all devices after admin approval.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close editor">
            &times;
          </button>
        </header>

        <form className="desk-form" onSubmit={handleSubmit}>
          <label className="desk-form__field">
            <span>Desk ID</span>
            <input type="text" value={desk.desk_id} disabled />
          </label>

          <label className="desk-form__field">
            <span>Employee Name</span>
            <input
              type="text"
              name="employee"
              value={formState.employee}
              onChange={handleFieldChange}
              placeholder="Leave blank if unassigned"
            />
          </label>

          <label className="desk-form__field">
            <span>Status</span>
            <select name="status" value={formState.status} onChange={handleFieldChange}>
              <option value="occupied">Occupied</option>
              <option value="available">Available</option>
            </select>
          </label>

          <label className="desk-form__field">
            <span>Employee Gender</span>
            <select name="gender" value={formState.gender} onChange={handleFieldChange}>
              <option value="">Not Set</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>

          <label className="desk-form__field">
            <span>Department</span>
            <select name="department" value={formState.department} onChange={handleFieldChange}>
              <option value="">Not Set</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="desk-form__field">
            <span>Shift Timing</span>
            <select name="shiftTiming" value={formState.shiftTiming} onChange={handleFieldChange}>
              <option value="">Not Set</option>
              {shiftTimingOptions.map((shiftTiming) => (
                <option key={shiftTiming} value={shiftTiming}>
                  {shiftTiming}
                </option>
              ))}
            </select>
          </label>

          <section className="desk-form__shift-manager" aria-label="Manage shift timings">
            <div className="desk-form__shift-grid">
              <label className="desk-form__field">
                <span>Add Shift Timing</span>
                <input
                  type="text"
                  value={newShiftTiming}
                  onChange={(event) => {
                    setNewShiftTiming(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. 4:00 PM - 1:00 AM"
                />
              </label>
              <button
                type="button"
                className="button button--ghost desk-form__shift-action"
                onClick={handleAddShiftTiming}
                disabled={isUpdatingShiftOptions || !newShiftTiming.trim()}
              >
                {isUpdatingShiftOptions ? 'Updating' : 'Add Shift'}
              </button>
            </div>

            <div className="desk-form__shift-grid">
              <label className="desk-form__field">
                <span>Remove Custom Shift</span>
                <select
                  value={shiftTimingToRemove}
                  onChange={(event) => {
                    setShiftTimingToRemove(event.target.value);
                    setErrorMessage('');
                  }}
                >
                  <option value="">Select custom shift</option>
                  {customShiftTimings.map((shiftTiming) => (
                    <option key={shiftTiming} value={shiftTiming}>
                      {shiftTiming}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--ghost desk-form__shift-action"
                onClick={handleRemoveShiftTiming}
                disabled={isUpdatingShiftOptions || !shiftTimingToRemove}
              >
                {isUpdatingShiftOptions ? 'Updating' : 'Remove Shift'}
              </button>
            </div>
          </section>

          {errorMessage ? <p className="modal-card__error">{errorMessage}</p> : null}

          <div className="desk-form__actions">
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving' : 'Save Desk'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default EditDeskModal;
