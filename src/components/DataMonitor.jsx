import { useState, useCallback, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip 
} from 'recharts';
import { useBluetooth } from '../hooks/useBluetooth';
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const SensorCard = ({ title, sensorName, data, dataKey, color, unit }) => {
  const lastValidEntry = [...data].reverse().find(entry => entry[dataKey] > 0);
  const latestValue = lastValidEntry ? lastValidEntry[dataKey] : '--';

  return (
    <div className="sensor-card">
      <div className="card-header">
        <div className="title-stack">
          <h3>{title}</h3>
          <span className="subtitle">{sensorName}</span>
        </div>
        <div className="badge">LIVE</div>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" aspect={window.innerWidth < 768 ? 1.5 : 2.2}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} />
            <Line 
              type="monotone" 
              data={data.map(d => ({ ...d, [dataKey]: d[dataKey] > 0 ? d[dataKey] : null }))}
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={false} 
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="value-footer" style={{ borderLeft: `5px solid ${color}` }}>
        <div className="main-val" style={{ color: color }}>
          <span className="number">
             {typeof latestValue === 'number' ? latestValue.toFixed(1) : latestValue}
          </span>
          <span className="unit">{unit}</span>
        </div>
      </div>
    </div>
  );
};

const DataMonitor = () => {
  const [history, setHistory] = useState([]);
  const { isConnected, connect, disconnect } = useBluetooth(SERVICE_UUID, CHARACTERISTIC_UUID);

  const isViewer = new URLSearchParams(window.location.search).get('role') === 'viewer';

  useEffect(() => {
  if (isViewer) {
    const liveRef = ref(db, 'live/current');
    
    // This triggers every time the Owner (You) sends a Bluetooth pulse to Firebase
    const unsubscribe = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHistory(prev => [...prev, data].slice(-50));
      }
    });

    return () => unsubscribe();
  }
}, [isViewer]);

const handleNewData = useCallback((newData) => {
    const dataPoint = {
        ...newData,
        // Add a timestamp for the X-axis
        time: new Date().toLocaleTimeString().split(' ')[0], 
        timestamp: Date.now()
    };

    // 1. Update the array for the graphs
    setHistory((prev) => {
        const newHistory = [...prev, dataPoint].slice(-50); // Keep last 50 points
        return newHistory;
    });

    // 2. Sync to Firebase (Belgium)
    // Use the same object so the Viewer sees exactly what you see
    set(ref(db, 'live/current'), dataPoint);
}, []);

  // 2. FOR THE GUEST: Listen to Firebase updates
  useEffect(() => {
    if (isViewer) {
      const liveRef = ref(db, 'live/current');
      const unsubscribe = onValue(liveRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setHistory(prev => [...prev, data].slice(-50));
        }
      });
      return () => unsubscribe();
    }
  }, [isViewer]);

  return (
    <div className="mobile-app-wrapper">
      <style>{`
        /* Reset and Base */
        #root { max-width: none !important; width: 100% !important; margin: 0 !important; }
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, sans-serif; }

        .mobile-app-wrapper {
          padding: 16px;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* Responsive Header */
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px;
          border-radius: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .logo-area h1 { margin: 0; font-size: 1.25rem; font-weight: 800; }
        .status-pill { font-size: 0.7rem; font-weight: 700; color: ${isConnected ? '#10b981' : '#94a3b8'}; }

        .btn-action {
          background: #3b82f6; color: white; border: none;
          padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem;
        }

        /* The Grid */
        .sensor-stack {
          display: grid;
          grid-template-columns: 1fr; /* Single column for mobile */
          gap: 16px;
        }

        .sensor-card {
          background: white;
          padding: 20px;
          border-radius: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }

        .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .title-stack h3 { margin: 0; font-size: 1.1rem; }
        .subtitle { font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        .badge { background: #f1f5f9; padding: 3px 8px; border-radius: 8px; font-size: 0.6rem; font-weight: 800; }

        .chart-container { width: 100%; margin: 15px 0; }

        .value-footer { background: #f8fafc; padding: 12px 20px; border-radius: 16px; }
        .main-val { display: flex; align-items: baseline; justify-content: flex-end; gap: 5px; }
        .number { font-size: 3rem; font-weight: 900; line-height: 1; }
        .unit { font-size: 1rem; font-weight: 700; color: #94a3b8; }

        /* DESKTOP REFINEMENTS */
        @media (min-width: 768px) {
          .mobile-app-wrapper { padding: 40px; }
          .sensor-stack { grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .logo-area h1 { font-size: 2rem; }
          .number { font-size: 4.5rem; }
        }

        @media (min-width: 1200px) {
          .sensor-stack { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <header className="app-header">
        <div className="logo-area">
          <h1>Pectus Pro</h1>
          <span className="status-pill">
           {isViewer 
             ? (history.length > 0 ? 'LIVE FROM CLOUD' : 'WAITING FOR DATA...') 
             : (isConnected ? '● STREAMING' : '○ OFFLINE')}
         </span>
        </div>
        {!isViewer && (
        <button className="btn-action" onClick={isConnected ? disconnect : () => connect(handleNewData)}>
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
        )}
      </header>

      <div className="sensor-stack">
        <SensorCard title="Temp" sensorName="Thermistor" data={history} dataKey="temp" color="#ef4444" unit="°C" />
        <SensorCard title="Pressure" sensorName="FSR (A2)" data={history} dataKey="pressure" color="#3b82f6" unit="kg" />
        <SensorCard title="Heart Rate" sensorName="MAX30102" data={history} dataKey="hr" color="#f43f5e" unit="bpm" />
        <SensorCard title="SpO2" sensorName="MAX30102" data={history} dataKey="spo2" color="#10b981" unit="%" />
        <SensorCard title="Magnetic" sensorName="MLX90393" data={history} dataKey="mag" color="#f59e0b" unit="uT" />
      </div>
    </div>
  );
};

export default DataMonitor;