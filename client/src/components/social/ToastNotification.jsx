import useNotificationStore from '../../store/notificationStore';
import './ToastNotification.css';

export default function ToastNotification() {
  const { toasts } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type || 'info'}`}>
          <span className="toast__icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '💪'}
          </span>
          <div className="toast__content">
            {toast.title && <span className="toast__title">{toast.title}</span>}
            <span className="toast__message">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
