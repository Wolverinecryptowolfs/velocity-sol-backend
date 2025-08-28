export default async function handler(req, res) {
  const { days = 30 } = req.query;
  const startTime = Date.now();
  
  const calculateTechnicalIndicators = (prices, volumes) => {
    if (prices.length < 50) return {};
    
    // Simple Moving Averages
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    
    // RSI Calculation
    let gains = 0, losses = 0;
    for (let i = 1; i <= 14; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rs = gains / losses;
    const rsi = 100 - (100 / (1 + rs));
    
    // MACD
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Bollinger Bands
    const stdDev = Math.sqrt(prices.slice(-20).reduce((sum, price) => 
      sum + Math.pow(price - sma20, 2), 0) / 20);
    const upperBB = sma20 + (stdDev * 2);
    const lowerBB = sma20 - (stdDev * 2);
    
    // Support/Resistance Levels
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const support = [
      sortedPrices[Math.floor(sortedPrices.length * 0.1)],
      sortedPrices[Math.floor(sortedPrices.length * 0.2)]
    ];
    const resistance = [
      sortedPrices[Math.floor(sortedPrices.length * 0.8)],
      sortedPrices[Math.floor(sortedPrices.length * 0.9)]
    ];
    
    // Volatility
    const returns = prices.slice(1).map((price, i) => 
      (price - prices[i]) / prices[i]
    );
    const volatility = Math.sqrt(returns.reduce((sum, ret) => 
      sum + ret * ret, 0) / returns.length);
    
    // Volume Analysis
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeSpike = volumes[volumes.length - 1] > avgVolume * 1.5;
    
    return {
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 100) / 100,
      bollingerBands: {
        upper: Math.round(upperBB * 100) / 100,
        middle: sma20,
        lower: Math.round(lowerBB * 100) / 100
      },
      support,
      resistance,
      volatility: Math.round(volatility * 1000) / 1000,
      volumeSpike,
      avgVolume
    };
  };
  
  const calculateEMA = (prices, period) => {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  };
  
  try {
    const validDays = Math.min(Math.max(parseInt(days), 1), 365);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${validDays}&interval=daily`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    const prices = data.prices.map(p => p[1]);
    const volumes = data.total_volumes.map(v => v[1]);
    
    const technicals = calculateTechnicalIndicators(prices, volumes);
    
    const result = {
      success: true,
      days: validDays,
      prices,
      volumes,
      timestamps: data.prices.map(p => new Date(p[0])),
      technicals,
      source: 'coingecko',
      timestamp: new Date().toISOString()
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300');
    
    result.responseTime = Date.now() - startTime;
    return res.json(result);

  } catch (error) {
    const validDays = Math.min(Math.max(parseInt(days), 1), 365);
    const mockPrices = [];
    const mockVolumes = [];
    const basePrice = 120;
    
    for (let i = validDays; i >= 0; i--) {
      const dayOffset = (validDays - i) / validDays;
      const trend = Math.sin(dayOffset * Math.PI * 2) * 20;
      const noise = (Math.random() - 0.5) * 15;
      mockPrices.push(Math.max(basePrice + trend + noise, 50));
      mockVolumes.push(1000000000 + Math.random() * 1000000000);
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      fallback: {
        success: true,
        prices: mockPrices.reverse(),
        volumes: mockVolumes.reverse(),
        technicals: calculateTechnicalIndicators(mockPrices, mockVolumes),
        source: 'mock'
      },
      responseTime: Date.now() - startTime
    });
  }
}
