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
            {/* Circular badge border */}
            <circle cx="16" cy="16" r="14" stroke="#00e5ff" strokeWidth="1.5" fill="rgba(0,229,255,0.06)" />
            {/* Exhaust flame — drawn behind rocket */}
            <path d="M 14,22 C 12,26 13,30 16,28 C 19,30 20,26 18,22 Z"
                  fill="rgba(0,229,255,0.4)" stroke="#00e5ff" strokeWidth="0.6" />
            {/* Rocket body + nose cone */}
            <path d="M 16,3 L 20,10 L 20,22 L 12,22 L 12,10 Z"
                  fill="rgba(0,229,255,0.15)" stroke="#00e5ff" strokeWidth="1.2" strokeLinejoin="round" />
            {/* Left fin */}
            <path d="M 12,17 L 7,25 L 12,23 Z"
                  fill="rgba(0,229,255,0.15)" stroke="#00e5ff" strokeWidth="1" strokeLinejoin="round" />
            {/* Right fin */}
            <path d="M 20,17 L 25,25 L 20,23 Z"
                  fill="rgba(0,229,255,0.15)" stroke="#00e5ff" strokeWidth="1" strokeLinejoin="round" />
            {/* Porthole window */}
            <circle cx="16" cy="14" r="2" fill="rgba(0,229,255,0.35)" stroke="#00e5ff" strokeWidth="0.8" />
          </svg>
        </div>
        <span className="header-logo-name">READ</span>
        <span className="header-logo-subtitle">[Rocket Engine Analysis and Design - v{import.meta.env.VITE_APP_VERSION}]</span>
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
