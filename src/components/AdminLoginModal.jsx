import { useEffect, useEffectEvent, useState } from 'react';

function AdminLoginModal({ isConfigured, onClose, onLogin }) {
  const [formState, setFormState] = useState({
    username: 'admin',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!isConfigured) {
      setErrorMessage('Admin login is not configured on the server yet.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onLogin(formState);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
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
      <section className="modal-card modal-card--compact" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <header className="modal-card__header">
          <div className="modal-card__title-group">
            <p className="modal-card__eyebrow">Admin Access</p>
            <h2 id="admin-login-title">Sign In To Edit Desks</h2>
            <p className="modal-card__subnote">Everyone else stays in view-only mode on this browser.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close login">
            &times;
          </button>
        </header>

        <form className="desk-form" onSubmit={handleSubmit}>
          <label className="desk-form__field">
            <span>Username</span>
            <input type="text" name="username" value={formState.username} onChange={handleFieldChange} autoComplete="username" />
          </label>

          <label className="desk-form__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={formState.password}
              onChange={handleFieldChange}
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className="modal-card__error">{errorMessage}</p> : null}

          <div className="desk-form__actions">
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In' : 'Admin Login'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AdminLoginModal;
