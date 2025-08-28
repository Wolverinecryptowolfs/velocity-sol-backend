class FallbackHandler {
  static async executeWithFallback(primaryFn, fallbackFn, context = 'API') {
    try {
      console.log(`[${context}] Trying primary source...`);
      const result = await primaryFn();
      
      if (this.isValidResponse(result)) {
        console.log(`[${context}] Primary source successful`);
        return { ...result, source: 'primary' };
      } else {
        throw new Error('Invalid primary response');
      }
    } catch (primaryError) {
      console.log(`[${context}] Primary failed: ${primaryError.message}`);
      
      try {
        console.log(`[${context}] Trying fallback source...`);
        const result = await fallbackFn();
        
        if (this.isValidResponse(result)) {
          console.log(`[${context}] Fallback successful`);
          return { ...result, source: 'fallback' };
        } else {
          throw new Error('Invalid fallback response');
        }
      } catch (fallbackError) {
        console.error(`[${context}] Both sources failed`);
        return {
          success: false,
          error: `Both sources failed: ${primaryError.message} | ${fallbackError.message}`,
          source: 'none'
        };
      }
    }
  }

  static isValidResponse(response) {
    return response && 
           typeof response === 'object' && 
           !response.error &&
           response.success !== false;
  }

  static createMockResponse(type, baseValue = 120) {
    const mockResponses = {
      PRICE: {
        success: true,
        price: baseValue + (Math.random() - 0.5) * 10,
        change24h: (Math.random() - 0.5) * 10,
        source: 'mock'
      },
      HISTORICAL: {
        success: true,
        prices: Array.from({length: 30}, (_, i) => 
          baseValue + Math.sin(i * 0.2) * 20 + (Math.random() - 0.5) * 5
        ),
        volumes: Array.from({length: 30}, () => 
          1000000000 + Math.random() * 500000000
        ),
        source: 'mock'
      }
    };
    
    return mockResponses[type] || { success: false, source: 'mock' };
  }
}
