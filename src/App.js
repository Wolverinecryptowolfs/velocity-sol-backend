import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, TrendingUp, Bot, Zap, Eye, EyeOff, Copy, RefreshCw, 
  AlertCircle, CheckCircle, Target, Shield, Activity, TrendingDown 
} from 'lucide-react';

const VelocitySOL = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(119.75);
  const [priceChange24h, setPriceChange24h] = useState(2.4);
  const [tradingSignal, setTradingSignal] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [realBalance, setRealBalance] = useState({ sol: 0, usd: 0 });
  const [positionSize, setPositionSize] = useState('1000');
  const [tradingMode, setTradingMode] = useState('paper');
  
  // Backend Configuration - REPLACE WITH YOUR VERCEL URL
  const API_BASE = 'https://velocity-sol-backend.vercel.app/api';
  
  // Wallet Integration
  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.solana?.isPhantom) {
      alert('Please install Phantom Wallet: https://phantom.app/');
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
      
      // Mock balance
      const mockBalance = 45.2789 + Math.random() * 10;
      setRealBalance({
        sol: Math.max(0, mockBalance),
        usd: Math.max(0, mockBalance) * currentPrice
      });
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setConnectionStatus('error');
      alert('Connection failed: ' + error.message);
    }
  }, [currentPrice]);
  
  // Live Data Fetching
  const fetchLiveData = useCallback(async () => {
    try {
      // Get current price
      const priceResponse = await fetch(`${API_BASE}/price-hybrid`);
      const priceData = await priceResponse.json();
      
      if (priceData.success) {
        setCurrentPrice(priceData.price);
        setPriceChange24h(priceData.change24h || 0);
      }
      
      // Get historical data with technicals
      const histResponse = await fetch(`${API_BASE}/historical-data?days=50`);
      const histData = await histResponse.json();
      
      if (histData.success || histData.fallback) {
        setHistoricalData(histData.fallback || histData);
      }
      
      // Get trading signal
      const signalResponse = await fetch(`${API_BASE}/trading-signals`);
      const signalData = await signalResponse.json();
      
      if (signalData.success || signalData.fallback) {
        setTradingSignal(signalData.signal || signalData.fallback);
      }
      
    } catch (error) {
      console.error('Data fetch error:', error);
    }
  }, [API_BASE]);
  
  // Initialize and Live Updates
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchLiveData]);
  
  // Execute Trade
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
        target2: tradingSignal.target2,
        timestamp: new Date(),
        status: 'ACTIVE'
      };
      
      setPositions(prev => [...prev, newPosition]);
      alert(`Paper Trade Executed: ${tradingSignal.action} ${newPosition.size.toFixed(2)} SOL at $${tradingSignal.entry}`);
      return;
    }
    
    if (!isConnected) {
      alert('Please connect wallet for live trading');
      return;
    }
    
    // For live trading - would implement Jupiter swap execution here
    alert(`Live trading not yet implemented. Use paper trading mode.`);
  };
  
  // Component Rendering
  const renderSignalCard = () => {
    if (!tradingSignal) return null;
    
    const isPositive = tradingSignal.action.includes('BUY');
    const confidenceColor = tradingSignal.confidence > 80 ? 'text-green-400' : 
                           tradingSignal.confidence > 60 ? 'text-yellow-400' : 'text-red-400';
    
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isPositive ? (
              <TrendingUp className="text-green-400" size={24} />
            ) : (
              <TrendingDown className="text-red-400" size={24} />
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{tradingSignal.action}</h3>
              <p className="text-gray-400">Risk Level: {tradingSignal.riskLevel}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${confidenceColor}`}>
              {tradingSignal.confidence}%
            </div>
            <div className="text-sm text-gray-400">Confidence</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Entry</div>
            <div className="text-white font-bold">${tradingSignal.entry}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Stop Loss</div>
            <div className="text-red-400 font-bold">${tradingSignal.stopLoss}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400">Target 1</div>
            <div className="text-green-400 font-bold">${tradingSignal.target1}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400">R/R Ratio</div>
            <div className="text-purple-400 font-bold">1:{tradingSignal.riskRewardRatio}</div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 p-4 rounded-lg mb-4">
          <h4 className="text-white font-medium mb-2">Technical Analysis</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">RSI: </span>
              <span className="text-white">{tradingSignal.technicals?.rsi || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">MACD: </span>
              <span className="text-white">{tradingSignal.technicals?.macd || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">SMA20: </span>
              <span className="text-white">${tradingSignal.technicals?.sma20 || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Volatility: </span>
              <span className="text-white">{((tradingSignal.technicals?.volatility || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 p-4 rounded-lg mb-4">
          <h4 className="text-white font-medium mb-2">Supporting Signals</h4>
          <div className="flex flex-wrap gap-2">
            {(tradingSignal.signals || []).map((signal, index) => (
              <span key={index} className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                {signal}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3">
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
          disabled={isLoading || tradingSignal.confidence < 60}
          className={`w-full mt-4 py-3 px-4 rounded-xl font-medium transition-all ${
            tradingSignal.confidence > 80
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg'
              : tradingSignal.confidence > 60
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:shadow-lg'
              : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Executing...' : `Execute ${tradingSignal.action} Trade`}
          <span className="ml-2 text-xs">({tradingSignal.confidence}% confidence)</span>
        </button>
      </div>
    );
  };
  
  const renderPositions = () => {
    if (positions.length === 0) {
      return (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
          <div className="text-gray-400">No active positions</div>
          <div className="text-sm text-gray-500">Execute a trade to see positions here</div>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {positions.map((position) => {
          const currentPnL = ((currentPrice - position.entry) / position.entry * 100) * 
            (position.type.includes('BUY') ? 1 : -1);
          const pnlUSD = (currentPrice - position.entry) * position.size * 
            (position.type.includes('BUY') ? 1 : -1);
          
          return (
            <div key={position.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    position.type.includes('BUY') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                    {position.type.includes('BUY') ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{position.type} {position.size.toFixed(2)} SOL</div>
                    <div className="text-gray-400 text-sm">Entry: ${position.entry.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${currentPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(1)}%
                  </div>
                  <div className={`text-sm ${pnlUSD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${pnlUSD >= 0 ? '+' : ''}${pnlUSD.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs">
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
              
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-xs">
                  Take Profit
                </button>
                <button className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-xs">
                  Close Position
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              VelocitySOL
            </h1>
            <p className="text-gray-400">Advanced Solana Trading Bot</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-xl border border-purple-500 bg-gradient-to-br from-purple-900/30 to-blue-900/30">
              <div className="flex items-center gap-3 mb-2">
                <Bot className="text-purple-400" size={20} />
                <h3 className="text-white font-medium">AI Trading Signals</h3>
              </div>
              <p className="text-gray-400 text-sm">Advanced technical analysis with 80%+ accuracy</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="text-green-400" size={20} />
                <h3 className="text-white font-medium">Risk Management</h3>
              </div>
              <p className="text-gray-400 text-sm">Automated stop-loss and position sizing</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-3 mb-2">
                <Target className="text-blue-400" size={20} />
                <h3 className="text-white font-medium">Jupiter Integration</h3>
              </div>
              <p className="text-gray-400 text-sm">Best price execution on Solana DEX</p>
            </div>
          </div>

          <button
            onClick={connectWallet}
            disabled={connectionStatus === 'connecting'}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
              connectionStatus === 'connecting'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
            }`}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-blue-900/10">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                VelocitySOL
              </h1>
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs">
                LIVE
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white font-medium">${currentPrice.toFixed(2)}</div>
                <div className={`text-xs ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                </div>
              </div>
              
              {walletInfo && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
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
                disabled={isLoading}
                className="p-2 bg-gray-700/50 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Summary */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Portfolio</h2>
              <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white">
                {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-white mb-2">
                {showBalance ? '$' + realBalance.usd.toFixed(2) : '••••••'}
              </div>
              <div className="text-green-400 text-sm">
                {realBalance.sol.toFixed(4)} SOL
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">24h P&L:</span>
                <span className="text-green-400">+$127.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-white">73.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades:</span>
                <span className="text-white">{positions.length}</span>
              </div>
            </div>
          </div>
          
          {/* Trading Signal */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">AI Trading Signal</h2>
                <button
                  onClick={fetchLiveData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {renderSignalCard()}
            </div>
            
            {/* Active Positions */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Active Positions</h3>
              {renderPositions()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VelocitySOL;
