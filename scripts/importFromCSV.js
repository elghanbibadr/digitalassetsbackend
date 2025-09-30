// scripts/importDomains.js
const fs = require('fs');
const csv = require('csv-parser');

const STRAPI_URL = 'http://localhost:1337';

// Function to clean and extract domain extension
function extractExtension(domainName) {
  if (!domainName || domainName === 'Domains') return '.com';
  const parts = domainName.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '.com';
}

// Function to extract domain name without extension
function extractDomainName(domainName) {
  if (!domainName || domainName === 'Domains') return '';
  const parts = domainName.split('.');
  return parts[0];
}

// Function to parse keywords
function parseKeywords(keywordsString) {
  if (!keywordsString || keywordsString.trim() === '') return [];
  
  // Split by comma and clean each keyword
  return keywordsString
    .split(',')
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0);
}

// Function to determine category from keywords
function determineCategory(keywords, domainName) {
  const keywordString = keywords.join(' ').toLowerCase();
  const domain = domainName.toLowerCase();
  
  // Technology keywords
  if (keywordString.includes('ai') || keywordString.includes('gpt') || 
      keywordString.includes('tech') || keywordString.includes('software') ||
      keywordString.includes('code') || keywordString.includes('app') ||
      domain.includes('ai') || domain.includes('gpt') || domain.includes('tech')) {
    return 'technology';
  }
  
  // Health/Medical keywords
  if (keywordString.includes('health') || keywordString.includes('medical') ||
      keywordString.includes('medicare') || keywordString.includes('cancer') ||
      keywordString.includes('diabetes') || keywordString.includes('insurance')) {
    return 'health';
  }
  
  // Automotive keywords
  if (keywordString.includes('car') || keywordString.includes('auto') ||
      keywordString.includes('vehicle') || keywordString.includes('garage') ||
      keywordString.includes('repair') || keywordString.includes('transmission')) {
    return 'automotive';
  }
  
  // Fishing/Outdoor keywords
  if (keywordString.includes('fish') || keywordString.includes('fishing') ||
      keywordString.includes('outdoor') || keywordString.includes('camping') ||
      keywordString.includes('boat') || keywordString.includes('hunting')) {
    return 'outdoor';
  }
  
  // Home/Appliance keywords
  if (keywordString.includes('home') || keywordString.includes('appliance') ||
      keywordString.includes('repair') || keywordString.includes('manual') ||
      keywordString.includes('washing') || keywordString.includes('refrigerator')) {
    return 'home';
  }
  
  // Business/Finance keywords
  if (keywordString.includes('business') || keywordString.includes('finance') ||
      keywordString.includes('loan') || keywordString.includes('bank') ||
      keywordString.includes('money') || keywordString.includes('cash')) {
    return 'business';
  }
  
  // Sports/Activities keywords
  if (keywordString.includes('sport') || keywordString.includes('bike') ||
      keywordString.includes('racing') || keywordString.includes('basketball') ||
      keywordString.includes('snow') || keywordString.includes('mountain')) {
    return 'sports';
  }
  
  // Default category
  return 'general';
}

// Function to estimate price based on domain characteristics
function estimatePrice(domainName, keywords, description) {
  let basePrice = 500; // Base price
  
  // Premium .ai domains
  if (domainName.endsWith('.ai')) {
    basePrice = 2000;
  }
  
  // Short domains are more valuable
  const nameLength = extractDomainName(domainName).length;
  if (nameLength <= 6) {
    basePrice *= 3;
  } else if (nameLength <= 8) {
    basePrice *= 2;
  } else if (nameLength <= 10) {
    basePrice *= 1.5;
  }
  
  // Premium keywords increase value
  const keywordString = keywords.join(' ').toLowerCase();
  if (keywordString.includes('ai') || keywordString.includes('gpt')) {
    basePrice *= 1.5;
  }
  if (keywordString.includes('bitcoin') || keywordString.includes('crypto')) {
    basePrice *= 2;
  }
  if (keywordString.includes('insurance') || keywordString.includes('finance')) {
    basePrice *= 1.3;
  }
  
  // Add some randomness for realism
  const variation = 0.8 + (Math.random() * 0.4); // 80% to 120%
  return Math.round(basePrice * variation);
}

// Function to determine listing type
function determineListingType(price) {
  if (price >= 3000) return 'make-offer';
  if (price >= 1500) return Math.random() > 0.5 ? 'buy-now' : 'make-offer';
  if (price >= 800) return Math.random() > 0.7 ? 'lease' : 'buy-now';
  return 'buy-now';
}

// Main import function
async function importDomains() {
  const domains = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('domains.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Skip empty rows or header rows
        if (!row.Domains || row.Domains === 'Domains' || row.Domains.trim() === '') {
          return;
        }
        
        const domainName = extractDomainName(row.Domains);
        const extension = extractExtension(row.Domains);
        const keywords = parseKeywords(row.Keywords);
        const description = row.Description || `Premium domain name perfect for businesses in the ${determineCategory(keywords, domainName)} industry.`;
        const length = parseInt(row.Length) || domainName.length;
        const category = determineCategory(keywords, domainName);
        const price = estimatePrice(row.Domains, keywords, description);
        const listingType = determineListingType(price);
        
        const domainData = {
          name: domainName,
          description: description,
          keywords: keywords,
          length: length,
          // price: price,
          category: category,
          extension: extension,
          listingType: listingType,
          onSale: true,
          logo: `https://via.placeholder.com/100x50/007bff/ffffff?text=${domainName.substring(0, 3).toUpperCase()}`
        };
        
        domains.push(domainData);
      })
      .on('end', async () => {
        console.log(`Parsed ${domains.length} domains from CSV`);
        
        // Import domains to Strapi
        let successCount = 0;
        let errorCount = 0;
        
        for (const domainData of domains) {
          try {
            console.log(`Importing: ${domainData.name}${domainData.extension}`);
            
            const response = await fetch(`${STRAPI_URL}/api/domains`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                data: domainData
              })
            });
            
            if (response.ok) {
              successCount++;
              console.log(`✓ Successfully imported: ${domainData.name}${domainData.extension}`);
            } else {
              errorCount++;
              const errorText = await response.text();
              console.error(`✗ Failed to import ${domainData.name}${domainData.extension}: ${response.status} - ${errorText}`);
            }
          } catch (error) {
            errorCount++;
            console.error(`✗ Error importing ${domainData.name}${domainData.extension}:`, error.message);
          }
          
          // Add small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n=== IMPORT COMPLETE ===');
        console.log(`✓ Successfully imported: ${successCount} domains`);
        console.log(`✗ Failed to import: ${errorCount} domains`);
        console.log(`📊 Total processed: ${domains.length} domains`);
        
        resolve();
      })
      .on('error', reject);
  });
}

// Run the import
importDomains()
  .then(() => {
    console.log('Import process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import process failed:', error);
    process.exit(1);
  });