import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="cdlg-overlay" onClick={onCancel}>
      <div className="cdlg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cdlg-header">
          <span className="cdlg-title">{title}</span>
        </div>
        <div className="cdlg-body">
          <p className="cdlg-message">{message}</p>
        </div>
        <div className="cdlg-footer">
          <button className="cdlg-btn cdlg-btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`cdlg-btn cdlg-btn--confirm${danger ? ' cdlg-btn--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
