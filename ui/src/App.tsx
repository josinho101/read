import { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Header from './components/header/header';
import LeftPanel from './components/leftPanel/leftPanel';
import MainContent from './components/mainContent/mainContent';
import { type EngineDesignResult } from './services/engineDesignService';
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
  const [engineDesignResult, setEngineDesignResult] = useState<EngineDesignResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [engineName, setEngineName] = useState('Engine1');
  const [engineVersion, setEngineVersion] = useState('0.1');
  const [ambientPressureBar, setAmbientPressureBar] = useState(1.013);

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

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app-shell">
        <Header />
        <div className="app-body">
          <LeftPanel
            isLoading={isLoading}
            onDesignStart={handleDesignStart}
            onDesignResult={handleDesignResult}
            onDesignError={handleDesignError}
            onEngineMetaChange={handleEngineMetaChange}
            onAmbientPressureChange={handleAmbientPressureChange}
          />
          <MainContent
            engineDesignResult={engineDesignResult}
            engineName={engineName}
            engineVersion={engineVersion}
            ambientPressureBar={ambientPressureBar}
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
