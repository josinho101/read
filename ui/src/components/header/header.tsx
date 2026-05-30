import { IconButton, Tooltip } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import './Header.css';

export default function Header() {
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
        <Tooltip title="Import Engine File">
          <IconButton className="header-icon-btn" size="small">
            <FileUploadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export Engine File">
          <IconButton className="header-icon-btn" size="small">
            <FileDownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}
