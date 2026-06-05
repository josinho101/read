import { useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { type EngineImportData } from '../../services/engineDesignService';
import './header.css';

interface HeaderProps {
  onExportClick: () => void;
  onImportData: (data: EngineImportData) => void;
  onSaveToServer: () => void;
  onOpenSaved: () => void;
  hasUnsavedChanges: boolean;
}

export default function Header({ onExportClick, onImportData, onSaveToServer, onOpenSaved, hasUnsavedChanges }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as EngineImportData;
        if (!data.version || !data.inputs || !data.nozzleAdjustments) {
          alert('Invalid engine file format.');
          return;
        }
        onImportData(data);
      } catch {
        alert('Failed to parse engine file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
            <circle cx="16" cy="16" r="14" stroke="#00e5ff" strokeWidth="2" />
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#00e5ff" fontSize="10" fontWeight="bold" fontFamily="monospace">A</text>
          </svg>
        </div>
        <span className="header-logo-name">READ</span>
        <span className="header-logo-subtitle">[Rocket Engine Analysis and Design - v0.1]</span>
      </div>

      <div className="header-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Tooltip title="Open saved engines">
          <IconButton className="header-icon-btn" size="small" onClick={onOpenSaved}>
            <FolderOpenOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Save to server">
          <IconButton
            className={`header-icon-btn${hasUnsavedChanges ? ' header-icon-btn--glow' : ''}`}
            size="small"
            onClick={onSaveToServer}
          >
            <CloudUploadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Import engine file">
          <IconButton className="header-icon-btn" size="small" onClick={() => fileInputRef.current?.click()}>
            <FileUploadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export engine file">
          <IconButton className="header-icon-btn" size="small" onClick={onExportClick}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}
