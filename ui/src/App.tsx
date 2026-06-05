import { useState, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Header from './components/header/header';
import LeftPanel from './components/leftPanel/leftPanel';
import MainContent, { type Tab } from './components/mainContent/mainContent';
import { type EngineDesignResult, type EngineImportData, type EngineFormInputs } from './services/engineDesignService';
import { type InjectorType } from './services/injectorSweepService';
import { type NozzleType, type AngleOverrides, type FlowProperty } from './components/engineContour/isentropicFlow';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e5ff' },
    background: {
      default: '#090d12',
      paper: '#0d1117',
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          color: '#e0e0e0',
          backgroundColor: '#111820',
          '&:hover': {
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 229, 255, 0.15)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#111820',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '4px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '11px',
          backgroundColor: '#1a2535',
          border: '1px solid rgba(0, 229, 255, 0.2)',
        },
      },
    },
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('ENGINE CONTOUR');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [engineDesignResult, setEngineDesignResult] = useState<EngineDesignResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [engineName, setEngineName] = useState('Engine1');
  const [engineVersion, setEngineVersion] = useState('0.1');
  const [ambientPressureBar, setAmbientPressureBar] = useState(1.013);
  const [nozzleType, setNozzleType] = useState<NozzleType>('rao');
  const [angleOverrides, setAngleOverrides] = useState<AngleOverrides>({});
  const [importData, setImportData] = useState<EngineFormInputs | null>(null);
  const formSnapshotRef = useRef<EngineFormInputs | null>(null);

  // Simulation state (lifted from EngineContour so RightPanel can control it)
  const [showFlowSim, setShowFlowSim]               = useState(false);
  const [flowProperty, setFlowProperty]             = useState<FlowProperty>('mach');
  const [showParticles, setShowParticles]           = useState(false);
  const [showPlume, setShowPlume]                   = useState(false);
  const [lStarM, setLStarM]                         = useState<number | undefined>(undefined);
  const [contractionRatio, setContractionRatio]     = useState<number>(8.0);

  // Injector state (lifted here so export/import can persist it)
  const [injectorType, setInjectorType]                           = useState<InjectorType>('impinging');
  const [dOxMm, setDOxMm]                                         = useState(1.5);
  const [dFuelMm, setDFuelMm]                                     = useState(1.2);
  const [impingementHalfAngleDeg, setImpingementHalfAngleDeg]     = useState(45);

  const handleLeftToggle = useCallback(() => setLeftCollapsed(prev => !prev), []);

  const handleDesignStart = useCallback(() => setIsLoading(true), []);
  const handleDesignResult = useCallback((result: EngineDesignResult) => {
    setEngineDesignResult(result);
    setIsLoading(false);
  }, []);
  const handleDesignError = useCallback(() => setIsLoading(false), []);
  const handleEngineMetaChange = useCallback((name: string, version: string) => {
    setEngineName(name);
    setEngineVersion(version);
  }, []);
  const handleAmbientPressureChange = useCallback((value: number) => {
    setAmbientPressureBar(value);
  }, []);

  const handleExport = useCallback(() => {
    const form = formSnapshotRef.current;
    if (!form) return;
    const data: EngineImportData = {
      version: '1.0',
      inputs: { ...form },
      nozzleAdjustments: { nozzleType, angleOverrides },
      chamberDesign: { lStarM, contractionRatio },
      injectorConfig: { type: injectorType, dOxMm, dFuelMm, impingementHalfAngleDeg },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.engineName || 'engine'}_v${form.engineVersion || '0'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nozzleType, angleOverrides, lStarM, contractionRatio]);

  const handleImportData = useCallback((data: EngineImportData) => {
    setNozzleType(data.nozzleAdjustments.nozzleType);
    setAngleOverrides(data.nozzleAdjustments.angleOverrides);
    setImportData(data.inputs);
    if (data.chamberDesign) {
      setLStarM(data.chamberDesign.lStarM);
      setContractionRatio(data.chamberDesign.contractionRatio);
    }
    if (data.injectorConfig) {
      setInjectorType(data.injectorConfig.type);
      setDOxMm(data.injectorConfig.dOxMm);
      setDFuelMm(data.injectorConfig.dFuelMm);
      setImpingementHalfAngleDeg(data.injectorConfig.impingementHalfAngleDeg);
    }
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app-shell">
        <Header onExportClick={handleExport} onImportData={handleImportData} />
        <div className="app-body">
          <LeftPanel
            collapsed={leftCollapsed}
            onToggle={handleLeftToggle}
            isLoading={isLoading}
            onDesignStart={handleDesignStart}
            onDesignResult={handleDesignResult}
            onDesignError={handleDesignError}
            onEngineMetaChange={handleEngineMetaChange}
            onAmbientPressureChange={handleAmbientPressureChange}
            onFormChange={(f) => { formSnapshotRef.current = f; }}
            importData={importData}
            lStarM={lStarM}
            contractionRatio={contractionRatio}
            onLStarChange={setLStarM}
            onContractionRatioChange={setContractionRatio}
            onNavigateToCombustion={() => setActiveTab('COMBUSTION')}
          />
          <MainContent
            engineDesignResult={engineDesignResult}
            engineName={engineName}
            engineVersion={engineVersion}
            ambientPressureBar={ambientPressureBar}
            nozzleType={nozzleType}
            onNozzleTypeChange={setNozzleType}
            angleOverrides={angleOverrides}
            onAngleOverridesChange={setAngleOverrides}
            showFlowSim={showFlowSim}
            onShowFlowSimChange={setShowFlowSim}
            flowProperty={flowProperty}
            onFlowPropertyChange={setFlowProperty}
            showParticles={showParticles}
            onShowParticlesChange={setShowParticles}
            showPlume={showPlume}
            onShowPlumeChange={setShowPlume}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            injectorType={injectorType}
            onInjectorTypeChange={setInjectorType}
            dOxMm={dOxMm}
            onDOxMmChange={setDOxMm}
            dFuelMm={dFuelMm}
            onDFuelMmChange={setDFuelMm}
            impingementHalfAngleDeg={impingementHalfAngleDeg}
            onImpingementHalfAngleDegChange={setImpingementHalfAngleDeg}
          />
        </div>
      </div>

      {isLoading && (
        <Box sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(9, 13, 18, 0.78)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px 56px',
            backgroundColor: '#0d1117',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '6px',
            boxShadow: '0 0 60px rgba(0, 229, 255, 0.08), 0 24px 64px rgba(0, 0, 0, 0.8)',
          }}>
            <CircularProgress
              size={52}
              thickness={1.8}
              sx={{ color: '#00e5ff' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Box sx={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: '#00e5ff',
                textShadow: '0 0 12px rgba(0, 229, 255, 0.5)',
              }}>
                COMPUTING ENGINE PARAMETERS
              </Box>
              <Box sx={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                letterSpacing: '1px',
                color: 'rgba(200, 220, 230, 0.4)',
              }}>
                Hang tight; Crunching the numbers and optimizing the design.
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}
