import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, TrendingUp, Bot, Zap, Eye, EyeOff, Copy, RefreshCw, 
  AlertCircle, CheckCircle, Target, Shield, Activity, TrendingDown,
  Send, Download, X
} from 'lucide-react';

const VelocitySOL = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(119.75);
  const [priceChange24h, setPriceChange24h] = useState(2.4);
  const [tradingSignal, setTradingSignal] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
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
      
      try {
        const balance = await window.solana.request({
          method: "getBalance",
          params: [response.publicKey.toString()]
        });
        const solBalance = balance / 1000000000;
        setRealBalance({
          sol: solBalance,
          usd: solBalance * currentPrice
        });
      } catch (balanceError) {
        console.error('Balance fetch failed, using 0:', balanceError);
        setRealBalance({ sol: 0, usd: 0 });
      }
      
      const savedPositions = localStorage.getItem('velocitySOL_positions');
      const savedHistory = localStorage.getItem('velocitySOL_history');
      if (savedPositions) {
        setPositions(JSON.parse(savedPositions));
      }
      if (savedHistory) {
        setTradingHistory(JSON.parse(savedHistory));
      }
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setConnectionStatus('error');
      alert('Connection failed: ' + error.message);
    }
  }, [currentPrice]);
  
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
    try {
      const priceResponse = await fetch(API_BASE + '/price-hybrid');
      const priceData = await priceResponse.json();
      
      if (priceData.success) {
        setCurrentPrice(priceData.price);
        setPriceChange24h(priceData.change24h || 0);
      }
      
      const histResponse = await fetch(API_BASE + '/historical-data?days=50');
      const histData = await histResponse.json();
      
      if (histData.success || histData.fallback) {
        setHistoricalData(histData.fallback || histData);
      }
      
      const signalResponse = await fetch(API_BASE + '/trading-signals');
      const signalData = await signalResponse.json();
      
      if (signalData.success || signalData.fallback) {
        setTradingSignal(signalData.signal || signalData.fallback);
      }
      
    } catch (error) {
      console.error('Data fetch error:', error);
    }
  }, [API_BASE]);
  
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);
  
  useEffect(() => {
    const savedPositions = localStorage.getItem('velocitySOL_positions');
    const savedHistory = localStorage.getItem('velocitySOL_history');
    if (savedPositions) {
      try {
        const parsedPositions = JSON.parse(savedPositions);
        setPositions(parsedPositions);
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    }
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setTradingHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  }, []);
  
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
      
      const updatedPositions = [...positions, newPosition];
      setPositions(updatedPositions);
      
      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
      
      alert('Paper Trade Executed: ' + tradingSignal.action + ' ' + newPosition.size.toFixed(2) + ' SOL at ' + tradingSignal.entry);
      return;
    }
    
    if (!isConnected) {
      alert('Please connect wallet for live trading');
      return;
    }
    
    alert('Live trading not yet implemented. Use paper trading mode.');
  };
  
  const closePosition = (positionId, partial = false) => {
    const position = positions.find(pos => pos.id === positionId);
    if (!position) return;
    
    const currentPnL = (currentPrice - position.entry) * position.size * (position.type.includes('BUY') ? 1 : -1);
    const pnlPercent = ((currentPrice - position.entry) / position.entry * 100) * (position.type.includes('BUY') ? 1 : -1);
    
    if (partial) {
      const newSize = position.size * 0.5;
      const partialPnL = currentPnL * 0.5;
      
      const updatedPositions = positions.map(pos => 
        pos.id === positionId 
          ? { ...pos, size: newSize }
          : pos
      );
      setPositions(updatedPositions);
      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
      
      const historyEntry = {
        id: Date.now(),
        type: 'PARTIAL_CLOSE',
        symbol: 'SOL',
        action: position.type,
        entry: position.entry,
        exit: currentPrice,
        size: position.size * 0.5,
        pnl: partialPnL,
        pnlPercent: pnlPercent,
        timestamp: new Date(),
        status: 'CLOSED'
      };
      
      const updatedHistory = [...tradingHistory, historyEntry];
      setTradingHistory(updatedHistory);
      localStorage.setItem('velocitySOL_history', JSON.stringify(updatedHistory));
      
      alert('Partial close: 50% of position closed with ' + (partialPnL >= 0 ? 'profit' : 'loss') + ': ' + partialPnL.toFixed(2));
    } else {
      const updatedPositions = positions.filter(pos => pos.id !== positionId);
      setPositions(updatedPositions);
      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
      
      const historyEntry = {
        id: Date.now(),
        type: 'FULL_CLOSE',
        symbol: 'SOL',
        action: position.type,
        entry: position.entry,
        exit: currentPrice,
        size: position.size,
        pnl: currentPnL,
        pnlPercent: pnlPercent,
        timestamp: new Date(),
        status: 'CLOSED'
      };
      
      const updatedHistory = [...tradingHistory, historyEntry];
      setTradingHistory(updatedHistory);
      localStorage.setItem('velocitySOL_history', JSON.stringify(updatedHistory));
      
      alert('Position closed with ' + (currentPnL >= 0 ? 'profit' : 'loss') + ': ' + currentPnL.toFixed(2) + ' (' + pnlPercent.toFixed(1) + '%)');
    }
  };
  
  const SendModal = () => {
    if (!showSendModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Send SOL</h3>
            <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={sendAddress}
                onChange={(e) => setSendAddress(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
                placeholder="Enter Solana address..."
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Amount (SOL)</label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600"
                placeholder="0.00"
                step="0.01"
              />
              <div className="text-xs text-gray-400 mt-1">
                Available: {realBalance.sol.toFixed(4)} SOL
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Send functionality would be implemented here with real Solana transaction');
                  setShowSendModal(false);
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Receive SOL</h3>
            <button onClick={() => setShowReceiveModal(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center mx-auto">
                <span className="text-gray-600">QR Code</span>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Your Wallet Address</label>
              <div className="bg-gray-700 p-3 rounded border border-gray-600 break-all text-sm text-white">
                {walletInfo && walletInfo.address}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(walletInfo && walletInfo.address)}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Copy Address
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
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
            <div className={'text-2xl font-bold ' + confidenceColor}>
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
              <span className="text-white">{(tradingSignal.technicals && tradingSignal.technicals.rsi) || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">MACD: </span>
              <span className="text-white">{(tradingSignal.technicals && tradingSignal.technicals.macd) || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">SMA20: </span>
              <span className="text-white">${(tradingSignal.technicals && tradingSignal.technicals.sma20) || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Volatility: </span>
              <span className="text-white">{(((tradingSignal.technicals && tradingSignal.technicals.volatility) || 0) * 100).toFixed(1)}%</span>
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
          className={
            'w-full mt-4 py-3 px-4 rounded-xl font-medium transition-all ' + (
              tradingSignal.confidence > 80
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg'
                : tradingSignal.confidence > 60
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:shadow-lg'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            )
          }
        >
          {isLoading ? 'Executing...' : 'Execute ' + tradingSignal.action + ' Trade'}
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
                  <div className={
                    'w-10 h-10 rounded-full flex items-center justify-center ' + (
                      position.type.includes('BUY') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    )
                  }>
                    {position.type.includes('BUY') ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{position.type} {position.size.toFixed(2)} SOL</div>
                    <div className="text-gray-400 text-sm">Entry: ${position.entry.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={'font-bold text-lg ' + (currentPnL >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(1)}%
                  </div>
                  <div className={'text-sm ' + (pnlUSD >= 0 ? 'text-green-400' : 'text-red-400')}>
                    ${pnlUSD >= 0 ? '+' : ''}{pnlUSD.toFixed(2)}
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
                <button 
                  onClick={() => {
                    if (currentPnL > 0) {
                      const profitPercent = Math.abs(currentPnL);
                      const closePercent = Math.min(profitPercent, 50);
                      const pnlUSD = (currentPrice - position.entry) * position.size * (position.type.includes('BUY') ? 1 : -1);
                      const partialPnL = pnlUSD * (closePercent / 100);
                      
                      const updatedPositions = positions.map(pos => 
                        pos.id === position.id 
                          ? { ...pos, size: pos.size * (1 - closePercent / 100) }
                          : pos
                      );
                      setPositions(updatedPositions);
                      localStorage.setItem('velocitySOL_positions', JSON.stringify(updatedPositions));
                      
                      const historyEntry = {
                        id: Date.now(),
                        type: 'PROFIT_TAKE',
                        symbol: 'SOL',
                        action: position.type,
                        entry: position.entry,
                        exit: currentPrice,
                        size: position.size * (closePercent / 100),
                        pnl: partialPnL,
                        pnlPercent: profitPercent,
                        timestamp: new Date(),
                        status: 'CLOSED'
                      };
                      
                      const updatedHistory = [...tradingHistory, historyEntry];
                      setTradingHistory(updatedHistory);
                      localStorage.setItem('velocitySOL_history', JSON.stringify(updatedHistory));
                      
                      alert('Profit secured: ' + closePercent.toFixed(0) + '% of position closed (+$' + partialPnL.toFixed(2) + ')');
                    } else {
                      alert('Position is not in profit. Current P&L: ' + currentPnL.toFixed(1) + '%');
                    }
                  }}
                  disabled={currentPnL <= 0}
                  className={
                    'flex-1 py-2 px-3 rounded text-xs font-medium ' + (
                      currentPnL > 0 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    )
                  }
                >
                  Take Profit {currentPnL > 0 ? '(+' + currentPnL.toFixed(1) + '%)' : ''}
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
            className={
              'w-full py-3 px-4 rounded-xl font-medium transition-all ' + (
                connectionStatus === 'connecting'
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
              )
            }
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
                <div className={'text-xs ' + (priceChange24h >= 0 ? 'text-green-400' : 'text-red-400')}>
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
                title="Refresh Data"
              >
                <RefreshCw className={'w-4 h-4 ' + (isLoading ? 'animate-spin' : '')} />
              </button>

              <button
                onClick={disconnectWallet}
                className="px-3 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors text-sm"
                title="Disconnect Wallet"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Portfolio</h2>
              <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white">
                {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-white mb-2">
                {showBalance ? ' + realBalance.usd.toFixed(2) : '******'}
              </div>
              <div className="text-green-400 text-sm">
                {realBalance.sol.toFixed(4)} SOL
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send size={16} />
                Send
              </button>
              <button
                onClick={() => setShowReceiveModal(true)}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                Receive
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">24h P&L:</span>
                <span className="text-green-400">
                  ${tradingHistory.length > 0 
                    ? tradingHistory
                        .filter(trade => new Date(trade.timestamp) > new Date(Date.now() - 24*60*60*1000))
                        .reduce((sum, trade) => sum + trade.pnl, 0)
                        .toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-white">
                  {tradingHistory.length > 0 
                    ? ((tradingHistory.filter(trade => trade.pnl > 0).length / tradingHistory.length) * 100).toFixed(1)
                    : '0.0'
                  }%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Trades:</span>
                <span className="text-white">{tradingHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Positions:</span>
                <span className="text-white">{positions.length}</span>
              </div>
            </div>
            
            {tradingHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-3">Recent Trades</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tradingHistory.slice(-5).reverse().map((trade) => (
                    <div key={trade.id} className="bg-gray-700/30 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={
                            'w-6 h-6 rounded-full flex items-center justify-center ' + (
                              trade.pnl >= 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                            )
                          }>
                            {trade.pnl >= 0 ? '+' : '-'}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">
                              {trade.action} {trade.size.toFixed(2)} SOL
                            </div>
                            <div className="text-xs text-gray-400">
                              ${trade.entry} → ${trade.exit}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={
                            'font-medium text-sm ' + (
                              trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                            )
                          }>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                          <div className={
                            'text-xs ' + (
                              trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                            )
                          }>
                            {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">AI Trading Signal</h2>
                <button
                  onClick={fetchLiveData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={'w-4 h-4 ' + (isLoading ? 'animate-spin' : '')} />
                  Refresh
                </button>
              </div>
              
              {renderSignalCard()}
            </div>
            
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Active Positions</h3>
              {renderPositions()}
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
