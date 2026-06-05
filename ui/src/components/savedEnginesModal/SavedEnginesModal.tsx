import { useState, useEffect, useMemo } from 'react';
import { IconButton, Tooltip, CircularProgress, TextField, Snackbar, Alert } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { engineStorageService, type SavedEngineEntry } from '../../services/engineStorageService';
import { type EngineImportData } from '../../services/engineDesignService';
import ConfirmDialog from '../confirmDialog/ConfirmDialog';
import './SavedEnginesModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportData: (data: EngineImportData) => void;
}

export default function SavedEnginesModal({ open, onClose, onImportData }: Props) {
  const [engines, setEngines] = useState<SavedEngineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ name: string; version: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setLoading(true);
    engineStorageService
      .listEngines()
      .then(setEngines)
      .catch(() => setEngines([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filteredEngines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return engines;
    return engines.filter(
      (e) => e.name.toLowerCase().includes(q) || e.version.toLowerCase().includes(q),
    );
  }, [engines, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, SavedEngineEntry[]>();
    for (const e of filteredEngines) {
      const list = map.get(e.name) ?? [];
      list.push(e);
      map.set(e.name, list);
    }
    return map;
  }, [filteredEngines]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleLoad = async (name: string, version: string) => {
    const key = `${name}@${version}`;
    setActionLoading(key);
    try {
      const data = await engineStorageService.getEngine(name, version);
      onImportData(data);
      onClose();
    } catch {
      setNotification({ message: `Failed to load engine '${name}' v${version}.`, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (name: string, version: string) => {
    setPendingDelete({ name, version });
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const { name, version } = pendingDelete;
    setPendingDelete(null);
    const key = `${name}@${version}`;
    setActionLoading(key);
    try {
      await engineStorageService.deleteEngine(name, version);
      setEngines((prev) => prev.filter((e) => !(e.name === name && e.version === version)));
    } catch {
      setNotification({ message: `Failed to delete engine '${name}' v${version}.`, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (!open) return null;

  return (
    <div className="sem-overlay" onClick={onClose}>
      <div className="sem-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sem-header">
          <span className="sem-title">SAVED ENGINES</span>
          <button className="sem-close" onClick={onClose}>✕</button>
        </div>

        <div className="sem-search">
          <TextField
            size="small"
            placeholder="Search by name or version…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            autoFocus
            slotProps={{
              input: {
                sx: {
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: '12px',
                  color: '#e0e0e0',
                  backgroundColor: '#0d1117',
                  '& fieldset': { borderColor: 'rgba(0,229,255,0.25)' },
                  '&:hover fieldset': { borderColor: 'rgba(0,229,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                },
              },
              inputLabel: { sx: { fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' } },
            }}
          />
        </div>

        <div className="sem-body">
          {loading && (
            <div className="sem-center">
              <CircularProgress size={28} thickness={1.8} sx={{ color: '#00e5ff' }} />
            </div>
          )}

          {!loading && grouped.size === 0 && (
            <div className="sem-empty">
              {search ? 'No engines match your search.' : 'No saved engines yet.'}
            </div>
          )}

          {!loading && Array.from(grouped.entries()).map(([name, versions]) => {
            const isExpanded = !!search.trim() || expandedGroups.has(name) || versions.length === 1;
            return (
              <div key={name} className="sem-group">
                <button
                  className="sem-group-header"
                  onClick={() => versions.length > 1 && toggleGroup(name)}
                  style={{ cursor: versions.length > 1 ? 'pointer' : 'default' }}
                >
                  <span className="sem-group-arrow">
                    {versions.length > 1
                      ? (isExpanded ? <KeyboardArrowDownIcon fontSize="inherit" /> : <KeyboardArrowRightIcon fontSize="inherit" />)
                      : <span style={{ display: 'inline-block', width: 16 }} />}
                  </span>
                  <span className="sem-group-name">{name}</span>
                  <span className="sem-group-count">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                </button>

                {isExpanded && (
                  <div className="sem-versions">
                    {versions.map((e) => {
                      const key = `${e.name}@${e.version}`;
                      const busy = actionLoading === key;
                      return (
                        <div key={e.version} className="sem-row">
                          <div className="sem-row-info">
                            <span className="sem-row-version">v{e.version}</span>
                            <span className="sem-row-date">{formatDate(e.saved_at)}</span>
                          </div>
                          <div className="sem-row-actions">
                            {busy ? (
                              <CircularProgress size={16} thickness={2} sx={{ color: '#00e5ff', mx: '4px' }} />
                            ) : (
                              <>
                                <Tooltip title="Load engine">
                                  <IconButton
                                    size="small"
                                    className="sem-action-btn"
                                    onClick={() => handleLoad(e.name, e.version)}
                                  >
                                    <FileOpenOutlinedIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete engine">
                                  <IconButton
                                    size="small"
                                    className="sem-action-btn sem-action-delete"
                                    onClick={() => handleDelete(e.name, e.version)}
                                  >
                                    <DeleteOutlinedIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Snackbar
        open={!!notification}
        autoHideDuration={3500}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity}
          sx={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={!!pendingDelete}
        title="DELETE ENGINE"
        message={
          pendingDelete
            ? `Delete engine '${pendingDelete.name}' v${pendingDelete.version}? This cannot be undone.`
            : ''
        }
        confirmLabel="DELETE"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
