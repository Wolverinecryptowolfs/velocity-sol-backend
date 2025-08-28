export default async function handler(req, res) {
  const startTime = Date.now();
  
  const generateAdvancedSignal = async () => {
    try {
      // Get historical data
      const histResponse = await fetch(`${req.headers.host}/api/historical-data?days=50`);
      const histData = await histResponse.json();
      
      if (!histData.success) throw new Error('Failed to fetch historical data');
      
      const { prices, volumes, technicals } = histData.fallback || histData;
      const currentPrice = prices[prices.length - 1];
      
      // Advanced Signal Scoring
      let score = 0;
      let confidence = 50;
      let signals = [];
      let riskLevel = 'MEDIUM';
      
      // 1. Trend Analysis (40% weight)
      if (technicals.sma20 > technicals.sma50) {
        score += 3;
        signals.push('Bullish Trend (SMA20 > SMA50)');
        if (currentPrice > technicals.sma20) {
          score += 1;
          signals.push('Price Above SMA20');
        }
      } else {
        score -= 2;
        signals.push('Bearish Trend');
      }
      
      // 2. RSI Analysis (25% weight)
      if (technicals.rsi < 30) {
        score += 3;
        signals.push('RSI Oversold (High Probability Bounce)');
        confidence += 15;
      } else if (technicals.rsi > 70) {
        score -= 3;
        signals.push('RSI Overbought (High Probability Pullback)');
        confidence += 15;
      } else if (technicals.rsi > 40 && technicals.rsi < 60) {
        score += 1;
        signals.push('RSI Neutral Zone');
      }
      
      // 3. MACD Analysis (20% weight)
      if (technicals.macd > 0) {
        score += 2;
        signals.push('MACD Bullish Crossover');
      } else {
        score -= 1;
        signals.push('MACD Below Zero');
      }
      
      // 4. Bollinger Bands (15% weight)
      const { upper, lower, middle } = technicals.bollingerBands;
      if (currentPrice <= lower) {
        score += 2.5;
        signals.push('Price at Lower Bollinger Band (Oversold)');
        confidence += 10;
      } else if (currentPrice >= upper) {
        score -= 2.5;
        signals.push('Price at Upper Bollinger Band (Overbought)');
        confidence += 10;
      }
      
      // 5. Support/Resistance Analysis
      const nearSupport = technicals.support.some(level => 
        Math.abs(currentPrice - level) / level < 0.02
      );
      const nearResistance = technicals.resistance.some(level => 
        Math.abs(currentPrice - level) / level < 0.02
      );
      
      if (nearSupport) {
        score += 2;
        signals.push('Near Major Support Level');
        riskLevel = 'LOW';
      }
      if (nearResistance) {
        score -= 1.5;
        signals.push('Near Major Resistance Level');
      }
      
      // 6. Volume Confirmation
      if (technicals.volumeSpike) {
        score += 1;
        signals.push('Volume Spike Confirmation');
        confidence += 5;
      }
      
      // 7. Volatility Analysis
      if (technicals.volatility > 0.05) {
        riskLevel = 'HIGH';
        confidence -= 5;
        signals.push('High Volatility Environment');
      } else if (technicals.volatility < 0.02) {
        riskLevel = 'LOW';
        confidence += 5;
        signals.push('Low Volatility (Breakout Potential)');
      }
      
      // 8. Pattern Recognition
      const priceArray = prices.slice(-10);
      if (isAscendingTriangle(priceArray)) {
        score += 2;
        signals.push('Ascending Triangle Pattern');
        confidence += 10;
      }
      if (isDoubleBottom(priceArray)) {
        score += 3;
        signals.push('Double Bottom Reversal Pattern');
        confidence += 15;
      }
      
      // Final Scoring
      confidence = Math.min(95, Math.max(20, confidence + Math.abs(score) * 5));
      const action = score > 3 ? 'STRONG_BUY' : 
                   score > 1 ? 'BUY' : 
                   score < -3 ? 'STRONG_SELL' : 
                   score < -1 ? 'SELL' : 'HOLD';
      
      // Risk Management Calculations
      const stopLossDistance = technicals.volatility * 2;
      const takeProfitDistance = stopLossDistance * 2.5;
      
      const entry = currentPrice * (action.includes('BUY') ? 0.999 : 1.001);
      const stopLoss = action.includes('BUY') ? 
        Math.max(entry * (1 - stopLossDistance), technicals.support[0] || entry * 0.95) :
        Math.min(entry * (1 + stopLossDistance), technicals.resistance[0] || entry * 1.05);
      
      const target1 = action.includes('BUY') ? 
        entry * (1 + takeProfitDistance * 0.6) :
        entry * (1 - takeProfitDistance * 0.6);
      const target2 = action.includes('BUY') ? 
        entry * (1 + takeProfitDistance) :
        entry * (1 - takeProfitDistance);
      
      const riskRewardRatio = Math.abs(target1 - entry) / Math.abs(entry - stopLoss);
      
      return {
        success: true,
        signal: {
          action,
          score: Math.round(score * 10) / 10,
          confidence: Math.round(confidence),
          riskLevel,
          entry: Math.round(entry * 100) / 100,
          stopLoss: Math.round(stopLoss * 100) / 100,
          target1: Math.round(target1 * 100) / 100,
          target2: Math.round(target2 * 100) / 100,
          riskRewardRatio: Math.round(riskRewardRatio * 10) / 10,
          signals,
          technicals,
          positionSizing: {
            maxRiskPerTrade: 0.02, // 2% of portfolio
            recommendedSize: confidence > 80 ? 'LARGE' : confidence > 60 ? 'MEDIUM' : 'SMALL'
          }
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: {
          action: 'HOLD',
          score: 0,
          confidence: 50,
          entry: 119.75,
          signals: ['Error in signal generation - using safe defaults']
        }
      };
    }
  };
  
  // Pattern Recognition Functions
  const isAscendingTriangle = (prices) => {
    if (prices.length < 5) return false;
    const highs = prices.filter((_, i) => i % 2 === 0);
    const lows = prices.filter((_, i) => i % 2 === 1);
    
    const highsFlat = highs.slice(1).every((high, i) => 
      Math.abs(high - highs[0]) / highs[0] < 0.02
    );
    const lowsRising = lows.slice(1).every((low, i) => low > lows[i]);
    
    return highsFlat && lowsRising;
  };
  
  const isDoubleBottom = (prices) => {
    if (prices.length < 7) return false;
    const minIndex1 = prices.indexOf(Math.min(...prices.slice(0, 3)));
    const minIndex2 = prices.indexOf(Math.min(...prices.slice(4)));
    
    return Math.abs(prices[minIndex1] - prices[minIndex2]) / prices[minIndex1] < 0.03;
  };
  
  try {
    const result = await generateAdvancedSignal();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60'); // 1 minute cache
    
    result.responseTime = Date.now() - startTime;
    return res.json(result);
    
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
}
