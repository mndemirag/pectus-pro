const BatteryStatus = ({ battery }) => {
  if (!battery) return null;
  
  const { level, isCharging, isUsbOnly } = battery;

  // Determine color based on state and level
  const getFillColor = () => {
    if (isCharging || isUsbOnly) return "#10b981"; // Success Green
    if (level <= 20) return "#ef4444"; // Danger Red
    return "#3b82f6"; // Primary Blue
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}>
      <div style={{
        width: '40px',
        height: '20px',
        border: '2px solid #333',
        borderRadius: '4px',
        position: 'relative',
        padding: '2px',
        backgroundColor: '#fff'
      }}>
        {/* Battery Level Fill */}
        <div style={{
          width: `${isUsbOnly ? 100 : level}%`,
          height: '100%',
          backgroundColor: getFillColor(),
          transition: 'width 0.4s ease-in-out',
          borderRadius: '1px'
        }} />
        
        {/* Battery Positive Terminal */}
        <div style={{
          position: 'absolute',
          right: '-5px',
          top: '5px',
          width: '3px',
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '0 2px 2px 0'
        }} />
      </div>

      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
        {isUsbOnly ? "USB Power" : `${level}%`}
        {isCharging && " ⚡"}
      </span>
    </div>
  );
};

export default BatteryStatus;