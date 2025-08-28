export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    const healthChecks = [];

    // Test Jupiter API
    try {
      const jupiterResponse = await fetch(
        'https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112',
        { timeout: 3000 }
      );
      healthChecks.push({
        service: 'Jupiter Price API',
        status: jupiterResponse.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        canMakeRequest: rateLimiter.canMakeRequest('JUPITER')
      });
    } catch (error) {
      healthChecks.push({
        service: 'Jupiter Price API',
        status: 'unhealthy',
        error: error.message,
        canMakeRequest: false
      });
    }

    // Test CoinGecko API
    try {
      const coinGeckoResponse = await fetch(
        'https://api.coingecko.com/api/v3/ping',
        { timeout: 3000 }
      );
      healthChecks.push({
        service: 'CoinGecko API',
        status: coinGeckoResponse.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        canMakeRequest: rateLimiter.canMakeRequest('COINGECKO')
      });
    } catch (error) {
      healthChecks.push({
        service: 'CoinGecko API', 
        status: 'unhealthy',
        error: error.message,
        canMakeRequest: false
      });
    }

    // Overall health
    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    const anyHealthy = healthChecks.some(check => check.status === 'healthy');

    const result = {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      services: healthChecks,
      cache: cache.stats(),
      rateLimits: {
        jupiter: {
          canMakeRequest: rateLimiter.canMakeRequest('JUPITER'),
          waitTime: rateLimiter.getWaitTime('JUPITER')
        },
        coingecko: {
          canMakeRequest: rateLimiter.canMakeRequest('COINGECKO'),
          waitTime: rateLimiter.getWaitTime('COINGECKO')
        }
      }
    };

    const httpStatus = allHealthy ? 200 : anyHealthy ? 207 : 503;
    return res.status(httpStatus).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    });
  }
}
