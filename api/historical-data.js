export default async function handler(req, res) {
  const { days = 30 } = req.query;
  const startTime = Date.now();
  
  try {
    // Validate days parameter
    const validDays = Math.min(Math.max(parseInt(days), 1), 365);
    
    console.log(`Fetching ${validDays} days of SOL historical data...`);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${validDays}&interval=daily`,
      { 
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.prices || !data.total_volumes) {
      throw new Error('Invalid CoinGecko response format');
    }
    
    console.log(`Successfully fetched ${data.prices.length} data points`);
    
    const result = {
      success: true,
      days: validDays,
      prices: data.prices.map(p => p[1]),
      volumes: data.total_volumes.map(v => v[1]),
      timestamps: data.prices.map(p => new Date(p[0])),
      dataPoints: data.prices.length,
      source: 'coingecko',
      timestamp: new Date().toISOString()
    };

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=300'); // 5 minute cache
    
    result.responseTime = Date.now() - startTime;
    return res.json(result);

  } catch (error) {
    console.error('Historical data API error:', error);
    
    // Generate mock historical data as fallback
    const validDays = Math.min(Math.max(parseInt(days), 1), 365);
    const mockPrices = [];
    const mockVolumes = [];
    const basePrice = 120;
    
    for (let i = validDays; i >= 0; i--) {
      // Simulate price movement with some randomness
      const dayOffset = (validDays - i) / validDays;
      const trend = Math.sin(dayOffset * Math.PI * 2) * 20; // Sine wave trend
      const noise = (Math.random() - 0.5) * 15; // Random noise
      mockPrices.push(Math.max(basePrice + trend + noise, 50)); // Floor at $50
      
      // Mock volumes
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
        timestamps: Array.from({length: validDays + 1}, (_, i) => 
          new Date(Date.now() - (validDays - i) * 24 * 60 * 60 * 1000)
        ),
        source: 'mock',
        note: 'Using mock data due to API failure'
      },
      responseTime: Date.now() - startTime
    });
  }
}
