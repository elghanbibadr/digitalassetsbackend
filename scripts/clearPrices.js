const strapi = require('@strapi/strapi');

async function clearPrices() {
  // Initialize Strapi app
  const app = await strapi().load();
  
  try {
    // Update all domains to set price to null
    const result = await strapi.db.query('api::domain.domain').updateMany({
      where: {},
      data: { price: null }
    });
    
    console.log(`Successfully cleared prices for ${result.count || 'all'} domains!`);
  } catch (error) {
    console.error('Error clearing prices:', error);
  } finally {
    // Properly close the app
    await app.destroy();
    process.exit(0);
  }
}

clearPrices();