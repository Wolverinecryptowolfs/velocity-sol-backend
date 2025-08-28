export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // Jupiter Price API (Primary)
    const fetchJupiterPrice = async () => {
      const response = await fetch(
        'https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112&vsToken=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
      
      if (!response.ok) throw new Error('Jupiter API failed');
      
      const data = await response.json();
      const price = data.data?.So11111111111111111111111111111111111111112?.price;
      
      if (!price) throw new Error('Invalid Jupiter response');
      
      return {
        success: true,
        price: parseFloat(price),
        source: 'jupiter',
        timestamp: new Date().toISOString()
      };
    };

    // CoinGecko Fallback
    const fetchCoinGeckoPrice = async () => {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
      );
      
      if (!response.ok) throw new Error('CoinGecko API failed');
      
      const data = await response.json();
      
      if (!data.solana?.usd) throw new Error('Invalid CoinGecko response');
      
      return {
        success: true,
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change || 0,
        source: 'coingecko',
        timestamp: new Date().toISOString()
      };
    };

    // Try Jupiter first, fallback to CoinGecko
    let result;
    try {
      console.log('Trying Jupiter API...');
      result = await fetchJupiterPrice();
      console.log('Jupiter success!');
    } catch (jupiterError) {
      console.log('Jupiter failed:', jupiterError.message);
      try {
        console.log('Trying CoinGecko fallback...');
        result = await fetchCoinGeckoPrice();
        console.log('CoinGecko success!');
      } catch (coinGeckoError) {
        console.log('Both APIs failed, using mock data');
        result = {
          success: true,
          price: 119.75 + (Math.random() - 0.5) * 10,
          change24h: (Math.random() - 0.5) * 8,
          source: 'mock',
          error: `APIs failed: ${jupiterError.message} | ${coinGeckoError.message}`
        };
      }
    }

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=30'); // 30 second cache
    
    result.responseTime = Date.now() - startTime;
    return res.json(result);

  } catch (error) {
    console.error('Price API error:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      fallback: { 
        price: 119.75, 
        source: 'error-fallback',
        timestamp: new Date().toISOString()
      },
      responseTime: Date.now() - startTime
    });
  }
}
