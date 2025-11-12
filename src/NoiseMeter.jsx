import React from 'react';
import './NoiseMeter.css';

const NoiseMeter = ({ noiseLevel = 0 }) => {

  const getBarColor = () => {
    if (noiseLevel > 70) return '#e74c3c'; // red
    if (noiseLevel > 30) return '#f1c40f'; // yellow
    return '#2ecc71'; // green
  };

  // micro:bitの音量（0-255）をパーセンテージ（0-100）に変換
  const volumePercentage = Math.min(100, (noiseLevel / 255) * 100);

  return (
    <div className="noise-meter-container">
      <div className="meter-bar-wrapper">
        <div 
          className="meter-bar" 
          style={{ 
            width: `${volumePercentage}%`, 
            backgroundColor: getBarColor() 
          }}
        ></div>
      </div>
      <div className="volume-label">{Math.round(volumePercentage)}</div>
    </div>
  );
};

export default NoiseMeter;