import { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import GridOnIcon from '@mui/icons-material/GridOn';
import './mainContent.css';

const TABS = ['ENGINE CONTOUR', 'CALCULATED STEPS & EQUATIONS', 'REFERENCE'] as const;
type Tab = typeof TABS[number];

const STATS = [
  { label: 'SPECIFIC IMPULSE', value: '287.5', unit: 's' },
  { label: 'MASS FLOW RATE', value: '35.47', unit: 'kg/s' },
  { label: 'CHAMBER DIAMETER (DC)', value: '26.76', unit: 'cm' },
  { label: 'THROAT DIAMETER (DT)', value: '10.70', unit: 'cm' },
  { label: 'EXIT DIAMETER (DE)', value: '31.44', unit: 'cm' },
  { label: 'EXPANSION RATIO (E)', value: '8.63', unit: '' },
  { label: 'TOTAL ENGINE LENGTH', value: '56.0', unit: 'cm' },
];

export default function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>('ENGINE CONTOUR');
  const [zoom, setZoom] = useState(100);
  const [dimensionOverlay, setDimensionOverlay] = useState(true);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 20));
  const handleResetView = () => setZoom(100);

  return (
    <div className="main-content">
      {/* Tab bar */}
      <div className="main-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`main-tab ${activeTab === tab ? 'main-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="main-toolbar">
        <div className="toolbar-left">
          <div className="engine-badge">
            <span className="engine-badge-name">Engine</span>
            <span className="engine-badge-version">v0.1</span>
          </div>
          <div className="toolbar-divider" />
          <div className="grid-info">
            <GridOnIcon sx={{ fontSize: 13, color: 'rgba(0,229,255,0.6)' }} />
            <span>GRID SCALING: 1 DIV = 5.0 cm</span>
          </div>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-right">
          <div className="zoom-controls">
            <Tooltip title="Zoom out">
              <IconButton onClick={handleZoomOut} className="zoom-btn" size="small">
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <span className="zoom-value">{zoom}%</span>
            <Tooltip title="Zoom in">
              <IconButton onClick={handleZoomIn} className="zoom-btn" size="small">
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </div>

          <Button
            onClick={handleResetView}
            className="toolbar-btn"
            variant="outlined"
            size="small"
          >
            Reset View
          </Button>

          <Button
            onClick={() => setDimensionOverlay(!dimensionOverlay)}
            className={`toolbar-btn toolbar-btn--toggle ${dimensionOverlay ? 'toolbar-btn--active' : ''}`}
            variant="outlined"
            size="small"
          >
            Dimension Overlay
          </Button>

          <Button className="toolbar-btn" variant="outlined" size="small">
            Bell Nozzle Shape
          </Button>

          <Button
            className="toolbar-btn toolbar-btn--ignite"
            variant="contained"
            size="small"
            startIcon={<WhatshotIcon sx={{ fontSize: 14 }} />}
          >
            IGNITE ENGINE
          </Button>
        </div>
      </div>

      {/* Canvas / viewport */}
      <div className="main-viewport">
        {activeTab === 'ENGINE CONTOUR' && (
          <div className="canvas-placeholder">
            <div className="canvas-centerline" />
            <div className="canvas-label">
              Engine contour visualization will render here
            </div>
          </div>
        )}
        {activeTab === 'CALCULATED STEPS & EQUATIONS' && (
          <div className="canvas-placeholder canvas-placeholder--text">
            <div className="canvas-label">Calculated steps and equations will appear here</div>
          </div>
        )}
        {activeTab === 'REFERENCE' && (
          <div className="canvas-placeholder canvas-placeholder--text">
            <div className="canvas-label">Reference documentation will appear here</div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        {STATS.map((stat) => (
          <div key={stat.label} className="stat-item">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">
              {stat.value}
              {stat.unit && <span className="stat-unit"> {stat.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
