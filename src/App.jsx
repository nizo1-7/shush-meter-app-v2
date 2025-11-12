import React, { useState, useEffect, useRef } from 'react';
import NoiseMeter from './NoiseMeter';
import './App.css';
// IMPORTANT: Create a 'firebase.js' file in this 'src' directory.
// Copy the contents from 'firebase.js.example' and fill in your own Firebase project credentials.
import { db } from './firebase'; // Firebase設定をインポート
import { collection, addDoc, Timestamp } from 'firebase/firestore';

// micro:bitのBluetoothサービスとキャラクタリスティックのUUID
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // micro:bitからの通知用

function App() {
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [monitoringMode, setMonitoringMode] = useState('OFF'); // 'ON' or 'OFF'
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('準備完了');
  const [isDevMode, setIsDevMode] = useState(false); // 開発モードの切り替え

  const deviceRef = useRef(null);
  const lastSaveTimeRef = useRef(0);

  // --- データ保存ロジック ---
  useEffect(() => {
    const now = Date.now();
    // 監視モードがONで、最後の保存から2秒以上経過している場合のみ保存
    if (monitoringMode === 'ON' && now - lastSaveTimeRef.current > 2000) {
      saveNoiseData(noiseLevel, monitoringMode);
      lastSaveTimeRef.current = now;
    }
  }, [noiseLevel, monitoringMode]);

  const saveNoiseData = async (level, mode) => {
    try {
      await addDoc(collection(db, "noise_data"), {
        noise_level: level,
        mode: mode,
        timestamp: Timestamp.now()
      });
      console.log("Data saved to Firebase");
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  // --- Bluetoothロジック ---
  const handleConnect = async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth APIがこのブラウザではサポートされていません。');
      return;
    }
    try {
      setStatusMessage('micro:bitを検索中...');
      deviceRef.current = await navigator.bluetooth.requestDevice({
        filters: [{ services: [UART_SERVICE_UUID] }],
        optionalServices: [UART_SERVICE_UUID]
      });

      setStatusMessage('デバイスに接続中...');
      const server = await deviceRef.current.gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(UART_TX_CHAR_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleNotifications);

      setIsConnected(true);
      setStatusMessage('接続完了！');
      deviceRef.current.addEventListener('gattserverdisconnected', onDisconnected);
    } catch (error) {
      console.error('Bluetooth接続エラー:', error);
      setStatusMessage(`接続エラー: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    if (deviceRef.current) {
      deviceRef.current.gatt.disconnect();
    }
  };

  const onDisconnected = () => {
    setIsConnected(false);
    setStatusMessage('切断されました。');
    setNoiseLevel(0);
    setMonitoringMode('OFF');
  };

  const handleNotifications = (event) => {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(value).trim();

    if (text.startsWith('N:')) {
      const level = parseInt(text.substring(2), 10);
      if (!isNaN(level)) {
        setNoiseLevel(level);
      }
    } else if (text.startsWith('M:')) {
      const mode = text.substring(2);
      setMonitoringMode(mode);
    }
  };

  // --- 開発モード用ロジック ---
  const handleDevNoiseChange = (e) => {
    setNoiseLevel(Number(e.target.value));
  };

  const handleDevModeToggle = (mode) => {
    setMonitoringMode(mode);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>しずけさメーター</h1>
        <p>{statusMessage}</p>
      </header>
      
      <NoiseMeter noiseLevel={noiseLevel} />

      <div className="controls">
        {!isConnected && !isDevMode && (
          <button onClick={handleConnect} className="control-button">
            micro:bitに接続
          </button>
        )}
        {isConnected && (
          <button onClick={handleDisconnect} className="control-button disconnect">
            切断
          </button>
        )}
      </div>

      <div className="status-display">
        <p>接続状態: {isConnected ? '接続中' : '未接続'}</p>
        <p>監視モード: <span className={monitoringMode === 'ON' ? 'mode-on' : 'mode-off'}>{monitoringMode}</span></p>
      </div>

      <hr />

      {/* --- 開発モード用UI --- */}
      <div className="dev-mode">
        <label>
          <input 
            type="checkbox" 
            checked={isDevMode} 
            onChange={() => setIsDevMode(!isDevMode)}
          />
          開発モード
        </label>

        {isDevMode && (
          <div className="dev-controls">
            <h4>開発用コントロール</h4>
            <p>ノイズレベル調整:</p>
            <input 
              type="range" 
              min="0" 
              max="255" 
              value={noiseLevel} 
              onChange={handleDevNoiseChange} 
            />
            <p>モード切り替え:</p>
            <button onClick={() => handleDevModeToggle('ON')}>監視ON</button>
            <button onClick={() => handleDevModeToggle('OFF')}>監視OFF</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;