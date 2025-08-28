export default async function handler(req, res) {
  const { inputMint, outputMint, amount, slippageBps = 50 } = req.query;
  const startTime = Date.now();
  
  try {
    // Validate required parameters
    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: inputMint, outputMint, amount',
        example: '/api/jupiter-quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=So11111111111111111111111111111111111111112&amount=1000000'
      });
    }

    // Validate amount
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter - must be a positive integer'
      });
    }

    console.log(`Getting Jupiter quote: ${amountNum} ${inputMint} -> ${outputMint}`);

    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    const response = await fetch(quoteUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Jupiter API error: ${data.error}`);
    }

    console.log('Jupiter quote successful');

    const result = {
      success: true,
      quote: data,
      inputMint,
      outputMint,
      amount: amountNum,
      slippageBps: parseInt(slippageBps),
      priceImpactPct: parseFloat(data.priceImpactPct) || 0,
      estimatedAmountOut: data.outAmount,
      routeInfo: {
        numRoutes: data.routePlan?.length || 0,
        firstRoute: data.routePlan?.[0]?.swapInfo?.label || 'Unknown'
      },
      source: 'jupiter',
      timestamp: new Date().toISOString()
    };

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=10'); // 10 second cache (quotes change fast)
    
    result.responseTime = Date.now() - startTime;
    return res.json(result);

  } catch (error) {
    console.error('Jupiter quote API error:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime,
      note: 'Jupiter quote failed - this is normal in demo mode'
    });
  }
}
