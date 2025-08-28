export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'market-sentiment';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        ...cached,
        cached: true,
        responseTime: Date.now() - startTime
      });
    }

    // Fetch Fear & Greed Index
    const fetchFearGreed = async () => {
      const response = await fetch('https://api.alternative.me/fng/?limit=1', { timeout: 5000 });
      if (!response.ok) throw new Error('Fear & Greed API failed');
      
      const data = await response.json();
      const fngData = data.data?.[0];
      
      if (!fngData) throw new Error('Invalid Fear & Greed response');
      
      return {
        fearGreedIndex: parseInt(fngData.value),
        sentiment: fngData.value_classification,
        timestamp: fngData.timestamp
      };
    };

    // Fetch additional market data from CoinGecko
    const fetchMarketData = async () => {
      if (!rateLimiter.canMakeRequest('COINGECKO')) {
        throw new Error('CoinGecko rate limit exceeded');
      }

      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
        { timeout: 8000 }
      );

      if (!response.ok) throw new Error('CoinGecko market API failed');
      
      const data = await response.json();
      const marketData = data.market_data;
      
      return {
        marketCap: marketData.market_cap?.usd || 0,
        volume24h: marketData.total_volume?.usd || 0,
        priceChange24h: marketData.price_change_percentage_24h || 0,
        priceChange7d: marketData.price_change_percentage_7d || 0,
        allTimeHigh: marketData.ath?.usd || 0,
        allTimeLow: marketData.atl?.usd || 0,
        circulatingSupply: marketData.circulating_supply || 0
      };
    };

    // Execute both requests
    const [fearGreedResult, marketDataResult] = await Promise.allSettled([
      fetchFearGreed(),
      fetchMarketData()
    ]);

    // Combine results
    const result = {
      success: true,
      sentiment: {
        fearGreedIndex: 50,
        sentiment: 'Neutral',
        ...((fearGreedResult.status === 'fulfilled') ? fearGreedResult.value : {})
      },
      marketData: {
        marketCap: 0,
        volume24h: 0,
        ...((marketDataResult.status === 'fulfilled') ? marketDataResult.value : {})
      },
      source: {
        fearGreed: fearGreedResult.status === 'fulfilled' ? 'live' : 'mock',
        marketData: marketDataResult.status === 'fulfilled' ? 'live' : 'mock'
      },
      timestamp: new Date().toISOString()
    };

    // Cache result
    cache.set(cacheKey, result, 'MARKET');

    result.responseTime = Date.now() - startTime;
    result.cached = false;

    return res.json(result);

  } catch (error) {
    console.error('Market sentiment API error:', error);
    
    // Return mock sentiment data
    const mockResult = {
      success: false,
      error: error.message,
      fallback: {
        sentiment: {
          fearGreedIndex: 50 + Math.floor(Math.random() * 40),
          sentiment: 'Neutral'
        },
        marketData: {
          marketCap: 45000000000,
          volume24h: 2500000000
        },
        source: 'mock'
      },
      responseTime: Date.now() - startTime
    };

    return res.status(500).json(mockResult);
  }
}
