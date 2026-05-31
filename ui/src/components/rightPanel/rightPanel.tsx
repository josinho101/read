import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import './rightPanel.css';

export default function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`right-panel ${collapsed ? 'right-panel--collapsed' : ''}`}>
      <div className="right-panel-toggle">
        <Tooltip title={collapsed ? 'Expand panel' : 'Collapse panel'} placement="left">
          <IconButton onClick={() => setCollapsed(!collapsed)} className="toggle-btn" size="small">
            {collapsed ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      {!collapsed && (
        <div className="right-panel-content" />
      )}
    </aside>
  );
}
