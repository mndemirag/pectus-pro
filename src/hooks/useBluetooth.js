import { useState, useCallback } from 'react';

// persistent state outside the hook to survive re-renders and prevent flickering
let lastKnownBattery = { level: 0, isCharging: false, isUsbOnly: false, label: 'Initializing...' };
let lastUpdateTime = 0;

export const useBluetooth = () => {
 const [isConnected, setIsConnected] = useState(false);
 const [device, setDevice] = useState(null);


 const parseBatteryData = (rawString) => {
  const isBatteryMsg = /%|charging|usb|remaining/i.test(rawString);
  const currentTime = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  if (isBatteryMsg) {
   const levelMatch = rawString.match(/%(\d+)/);
   const newLevel = levelMatch ? parseInt(levelMatch[1], 10) : lastKnownBattery.level;

   const currentlyCharging = rawString.includes("charging");
   const currentlyUsb = rawString.includes("usb cable");

   // Check if the power state (plugged/unplugged) has changed
   const stateChanged = currentlyCharging !== lastKnownBattery.isCharging ||
    currentlyUsb !== lastKnownBattery.isUsbOnly;

   // Update if:
   // 1. 15 minutes have passed
   // 2. OR the charging state changed
   // 3. OR the current stored level is still 0 (Initial Load Fix)
   if (currentTime - lastUpdateTime >= fifteenMinutes || stateChanged || lastKnownBattery.level === 0) {
    lastKnownBattery = {
     level: newLevel,
     isCharging: currentlyCharging,
     isUsbOnly: currentlyUsb,
     isDischarging: rawString.includes("remaining")
    };

    // Only start the 15-minute timer if we actually have a real percentage
    if (newLevel > 0) {
     lastUpdateTime = currentTime;
    }
   }
  }

  return lastKnownBattery;
 };


 // 2. Sensor Parser (Handles 850bpm and standard T:/P:/B: labels)
 const parseValue = (rawString, label) => {
  let regex;
  if (label === 'HR') {
   // Specifically looks for digits followed by 'bpm'
   regex = /([\d.]+)\s*bpm/;
  } else {
   // Standard matching for T:, P:, B:
   regex = new RegExp(label + ":\\s*([\\d.-]+)");
  }
  const match = rawString.match(regex);
  return match ? parseFloat(match[1]) : 0;
 };

 const connect = async (onDataReceived) => {
  try {
   const selectedDevice = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'] // Nordic UART Service
   });

   const server = await selectedDevice.gatt.connect();
   const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
   const characteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8'); // TX Characteristic

   await characteristic.startNotifications();

   characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const value = event.target.value;
    const rawString = new TextDecoder().decode(value);

    // Structure the data correctly
    const battery = parseBatteryData(rawString);
    const sensorData = {
     temp: parseValue(rawString, 'T'),
     pressure: parseValue(rawString, 'P'),
     magnetic: parseValue(rawString, 'B'),
     hr: parseValue(rawString, 'HR')
    };

    // Send combined object to DataMonitor.jsx
    onDataReceived({ ...sensorData, battery });
   });

   setDevice(selectedDevice);
   setIsConnected(true);

   selectedDevice.addEventListener('gattserverdisconnected', () => {
    setIsConnected(false);
   });

  } catch (error) {
   console.error("Bluetooth Connection Error:", error);
  }
 };

 const disconnect = useCallback(() => {
  if (device && device.gatt.connected) {
   device.gatt.disconnect();
  }
  setIsConnected(false);
 }, [device]);

 return { isConnected, connect, disconnect };
};

export default useBluetooth;