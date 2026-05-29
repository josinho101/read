import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/header/header';
import LeftPanel from './components/leftPanel/leftPanel';
import MainContent from './components/mainContent/mainContent';
import Footer from './components/footer/footer';
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
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app-shell">
        <Header />
        <div className="app-body">
          <LeftPanel />
          <MainContent />
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
