import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, TrendingUp, Bot, Zap, Eye, EyeOff, Copy, RefreshCw, 
  Target, Shield, Activity, TrendingDown, Send, Download, X
} from 'lucide-react';

const VelocitySOL = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(119.75);
  const [priceChange24h, setPriceChange24h] = useState(2.4);
  const [tradingSignal, setTradingSignal] = useState(null);
  const [positions, setPositions] = useState([]);
  const [tradingHistory, setTradingHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [realBalance, setRealBalance] = useState({ sol: 0, usd: 0 });
  const [positionSize, setPositionSize] = useState('1000');
  const [tradingMode, setTradingMode] = useState('paper');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  
  const API_BASE = 'https://velocity-sol-backend.vercel.app/api';
  
  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.solana || !window.solana.isPhantom) {
      alert('Please install Phantom Wallet');
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      const response = await window.solana.connect();
      
      setIsConnected(true);
      setWalletInfo({
        address: response.publicKey.toString(),
        wallet: 'Phantom'
      });
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setConnectionStatus('error');
      alert('Connection failed');
    }
  }, []);
  
  const disconnectWallet = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
      setIsConnected(false);
      setWalletInfo(null);
      setRealBalance({ sol: 0, usd: 0 });
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const fetchLiveData = useCallback(async () => {
    // Mock data for now
    setTradingSignal({
      action: 'BUY SOL',
      confidence: 85,
      entry: 120.00,
      stopLoss: 115.00,
      target1: 130.00,
      target2: 135.00,
      riskLevel: 'Medium',
      riskRewardRatio: 2.5
    });
  }, []);
  
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);
  
  const executeTrade = async () => {
    if (!tradingSignal) {
      alert('No trading signal available');
      return;
    }
    
    const sizeUSD = parseFloat(positionSize) || 1000;
    
    if (tradingMode === 'paper') {
      const newPosition = {
        id: Date.now(),
        type: tradingSignal.action,
        entry: tradingSignal.entry,
        size: sizeUSD / tradingSignal.entry,
        stopLoss: tradingSignal.stopLoss,
        target1: tradingSignal.target1,
        timestamp: new Date(),
        status: 'ACTIVE'
      };
      
      const updatedPositions = [...positions, newPosition];
      setPositions(updatedPositions);
      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
      
      alert('Paper Trade Executed');
      return;
    }
    
    alert('Live trading not yet implemented');
  };
  
  const closePosition = (positionId) => {
    const position = positions.find(pos => pos.id === positionId);
    if (!position) return;
    
    const currentPnL = (currentPrice - position.entry) * position.size;
    
    const updatedPositions = positions.filter(pos => pos.id !== positionId);
    setPositions(updatedPositions);
    localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
    
    alert('Position closed');
  };
  
  const takeProfitAction = (position) => {
    const currentPnL = ((currentPrice - position.entry) / position.entry * 100);
    
    if (currentPnL > 0) {
      const closePercent = Math.min(currentPnL, 50);
      
      const updatedPositions = positions.map(pos => 
        pos.id === position.id 
          ? { ...pos, size: pos.size * (1 - closePercent / 100) }
          : pos
      );
      setPositions(updatedPositions);
      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
      
      alert('Profit secured: ' + closePercent.toFixed(0) + '% closed');
    } else {
      alert('Position is not in profit');
    }
  };
  
  const SendModal = () => {
    if (!showSendModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Send SOL</h3>
            <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Amount (SOL)</label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
                placeholder="0.00"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Send functionality would be implemented here');
                  setShowSendModal(false);
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReceiveModal = () => {
    if (!showReceiveModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Receive SOL</h3>
            <button onClick={() => setShowReceiveModal(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg mb-4">
              <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center mx-auto">
                <span className="text-gray-600">QR Code</span>
              </div>
            </div>
            
            <div className="bg-gray-700 p-3 rounded border border-gray-600 break-all text-sm text-white">
              {walletInfo && walletInfo.address}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">VelocitySOL</h1>
            <p className="text-gray-400">Advanced Solana Trading Bot</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-xl border border-purple-500 bg-purple-900 bg-opacity-30">
              <div className="flex items-center gap-3 mb-2">
                <Bot className="text-purple-400" size={20} />
                <h3 className="text-white font-medium">AI Trading Signals</h3>
              </div>
              <p className="text-gray-400 text-sm">Advanced technical analysis</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="text-green-400" size={20} />
                <h3 className="text-white font-medium">Risk Management</h3>
              </div>
              <p className="text-gray-400 text-sm">Automated stop-loss</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50">
              <div className="flex items-center gap-3 mb-2">
                <Target className="text-blue-400" size={20} />
                <h3 className="text-white font-medium">Jupiter Integration</h3>
              </div>
              <p className="text-gray-400 text-sm">Best price execution</p>
            </div>
          </div>

          <button
            onClick={connectWallet}
            disabled={connectionStatus === 'connecting'}
            className="w-full py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect Phantom Wallet'}
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-xs">
              Current SOL: ${currentPrice.toFixed(2)} ({priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
      <div className="bg-gray-800 bg-opacity-50 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white">VelocitySOL</h1>
              <span className="bg-green-500 bg-opacity-20 text-green-400 px-2 py-1 rounded-lg text-xs">
                LIVE
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white font-medium">${currentPrice.toFixed(2)}</div>
                <div className="text-xs text-green-400">
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                </div>
              </div>
              
              {walletInfo && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 bg-opacity-50 rounded-lg">
                  <Wallet className="text-blue-400" size={16} />
                  <span className="text-gray-300 text-sm font-mono">
                    {walletInfo.address.slice(0, 4)}...{walletInfo.address.slice(-4)}
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(walletInfo.address)}>
                    <Copy className="text-gray-400 hover:text-white" size={12} />
                  </button>
                </div>
              )}
              
              <button
                onClick={fetchLiveData}
                className="p-2 bg-gray-700 bg-opacity-50 text-gray-400 hover:text-white rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={disconnectWallet}
                className="px-3 py-2 bg-red-600 bg-opacity-20 text-red-400 rounded-lg text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Portfolio</h2>
              <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white">
                {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-white mb-2">
                {showBalance ? '$' + realBalance.usd.toFixed(2) : '******'}
              </div>
              <div className="text-green-400 text-sm">
                {realBalance.sol.toFixed(4)} SOL
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg"
              >
                <Send size={16} />
                Send
              </button>
              <button
                onClick={() => setShowReceiveModal(true)}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg"
              >
                <Download size={16} />
                Receive
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Positions:</span>
                <span className="text-white">{positions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades:</span>
                <span className="text-white">{tradingHistory.length}</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-4">AI Trading Signal</h2>
              
              {tradingSignal && (
                <div className="bg-gradient-to-r from-purple-900 to-blue-900 bg-opacity-30 rounded-2xl p-6 border border-purple-500 border-opacity-30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="text-green-400" size={24} />
                      <div>
                        <h3 className="text-xl font-bold text-white">{tradingSignal.action}</h3>
                        <p className="text-gray-400">Risk Level: {tradingSignal.riskLevel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {tradingSignal.confidence}%
                      </div>
                      <div className="text-sm text-gray-400">Confidence</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Entry</div>
                      <div className="text-white font-bold">${tradingSignal.entry}</div>
                    </div>
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Stop Loss</div>
                      <div className="text-red-400 font-bold">${tradingSignal.stopLoss}</div>
                    </div>
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Target 1</div>
                      <div className="text-green-400 font-bold">${tradingSignal.target1}</div>
                    </div>
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">R/R Ratio</div>
                      <div className="text-purple-400 font-bold">1:{tradingSignal.riskRewardRatio}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <label className="block text-gray-400 text-xs mb-1">Position Size (USD)</label>
                      <input
                        type="number"
                        value={positionSize}
                        onChange={(e) => setPositionSize(e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                        placeholder="1000"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-400 text-xs mb-1">Trading Mode</label>
                      <select
                        value={tradingMode}
                        onChange={(e) => setTradingMode(e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                      >
                        <option value="paper">Paper Trading</option>
                        <option value="live">Live Trading</option>
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={executeTrade}
                    className="w-full py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-green-600 to-green-700 text-white"
                  >
                    Execute {tradingSignal.action} Trade
                    <span className="ml-2 text-xs">({tradingSignal.confidence}% confidence)</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 bg-opacity-50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Active Positions</h3>
              
              {positions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
                  <div className="text-gray-400">No active positions</div>
                  <div className="text-sm text-gray-500">Execute a trade to see positions here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((position) => {
                    const currentPnL = ((currentPrice - position.entry) / position.entry * 100);
                    const pnlUSD = (currentPrice - position.entry) * position.size;
                    
                    return (
                      <div key={position.id} className="bg-gray-800 bg-opacity-50 p-4 rounded-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-600 bg-opacity-20 text-green-400">
                              <TrendingUp size={20} />
                            </div>
                            <div>
                              <div className="text-white font-medium">{position.type} {position.size.toFixed(2)} SOL</div>
                              <div className="text-gray-400 text-sm">Entry: ${position.entry.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-green-400">
                              +{currentPnL.toFixed(1)}%
                            </div>
                            <div className="text-sm text-green-400">
                              ${pnlUSD >= 0 ? '+' : ''}${pnlUSD.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                          <div>
                            <div className="text-gray-400">Current</div>
                            <div className="text-white">${currentPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Stop Loss</div>
                            <div className="text-red-400">${position.stopLoss.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Target</div>
                            <div className="text-green-400">${position.target1.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => takeProfitAction(position)}
                            className="flex-1 py-2 px-3 rounded text-xs font-medium bg-green-600 text-white"
                          >
                            Take Profit (+{currentPnL.toFixed(1)}%)
                          </button>
                          <button 
                            onClick={() => closePosition(position.id)}
                            className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-xs"
                          >
                            Close Position
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <SendModal />
      <ReceiveModal />
    </div>
  );
};

export default VelocitySOL;
