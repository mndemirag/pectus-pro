import { useState, useRef } from 'react';

export const useBluetooth = (serviceUuid, charUuid) => {
 const [isConnected, setIsConnected] = useState(false);
 const deviceRef = useRef(null);

 const connect = async (onDataReceived) => {
  try {
   const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [serviceUuid] }],
   });

   const server = await device.gatt.connect();
   const service = await server.getPrimaryService(serviceUuid);
   const characteristic = await service.getCharacteristic(charUuid);

   device.addEventListener('gattserverdisconnected', () => setIsConnected(false));

   await characteristic.startNotifications();

   characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const decoder = new TextDecoder();
    const rawString = decoder.decode(event.target.value);

    const parseValue = (label) => {
     let regex;

     if (label === 'HR') {
      // Special case: matches digits that come right before "bpm"
      regex = /([\d.]+)\s*bpm/;
     } else {
      // Standard case for T:, P:, SpO2:, and B:
      regex = new RegExp(label + ":\\s*([\\d.-]+)");
     }

     const match = rawString.match(regex);
     return match ? parseFloat(match[1]) : 0;
    };

    const parsedData = {
     temp: parseValue('T'),
     pressure: parseValue('P'),
     hr: parseValue('HR'),
     spo2: parseValue('SpO2'),
     mag: parseValue('B'),
     raw: rawString
    };

    // Logging for your Firebase transition
    console.log(">>> Raw String:", rawString);
    console.log(">>> Parsed HR:", parsedData.hr);

    onDataReceived(parsedData);
   });

   deviceRef.current = device;
   setIsConnected(true);
  } catch (error) {
   console.error(error);
   setIsConnected(false);
  }
 };

 return { isConnected, connect };
};