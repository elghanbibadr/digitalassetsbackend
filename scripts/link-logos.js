const axios = require('axios');

// Configuration
const STRAPI_URL = 'http://localhost:1337'; // Change if your Strapi runs on different port
const API_TOKEN = '4f7078d6a9ca1cc3cd40d1c8a95cde1ea14f9a490e26da72314c5da9b8cc0c93d9241418a56b2b18d1f5713b59728b3429e870a9b0c7ae8e8bebb0d94265115eef372a6106db8f85bb06537148664ddace935936f335e425a0ef88170d3bd2689625a68cb778fefdd9766794b4f88b86c13c4421c67ad0be9bf1399f1f835d6b'; // Get from Strapi Settings → API Tokens

async function linkLogosViaAPI() {
  try {
    console.log('Starting logo linking via API...');
    
    // Get all domains
    console.log('Fetching domains...');
    const domainsResponse = await axios.get(`${STRAPI_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
      params: { 'pagination[pageSize]': 1000 } // Adjust if you have more than 1000 domains
    });
    
    const domains = domainsResponse.data.data;
    console.log(`Found ${domains.length} domains`);
    
    // Get all media files
    console.log('Fetching media files...');
    const mediaResponse = await axios.get(`${STRAPI_URL}/api/upload/files`, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
      params: { 'pagination[pageSize]': 1000 } // Adjust if you have more than 1000 files
    });
    

    
    const mediaFiles = mediaResponse.data;
    console.log(`Found ${mediaFiles.length} media files`);
    
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each domain
    for (const domain of domains) {
      try {
        const domainData = domain;
        
        // Skip if already has a real logo (not placeholder)
        if (domainData.logo && !domainData.logo.includes('placeholder')) {
          console.log(`Domain already has real logo: ${domainData.name}${domainData.extension}`);
          skipped++;
          continue;
        }
        
        // Look for matching media file using just the domain name
        const domainNameOnly = domainData.name; // Just "insurancecards"
        
        // Try different file extensions
        const possibleNames = [
          `${domainNameOnly}.png`,
          `${domainNameOnly}.jpg`,
          `${domainNameOnly}.jpeg`,
          `${domainNameOnly}.gif`,
          `${domainNameOnly}.svg`
        ];
        
        let matchingFile = null;
        
        for (const possibleName of possibleNames) {
          matchingFile = mediaFiles.find(file => 
            file.name.toLowerCase() === possibleName.toLowerCase()
          );
          if (matchingFile) break;
        }
        
        if (matchingFile) {
            console.log("domaine id",domain.id)
          // Link the logo to the domain using the media file ID
        const res=  await axios.put(`${STRAPI_URL}/api/domains/${domain.id}`, {
            data: { 
              logo: matchingFile.id 
            }
          }, {
            headers: { 
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          console.log("reees",res)
          
          console.log(`✅ Linked ${domainData.name}${domainData.extension} → ${matchingFile.name}`);
          successful++;
        } else {
          console.log(`❌ No matching image found for: ${domainNameOnly} (looking for ${domainNameOnly}.png)`);
          failed++;
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.log(`❌ Error processing ${domain?.name || 'unknown'}: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n🎉 Linking completed!`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Check configuration
if (API_TOKEN === 'YOUR_API_TOKEN_HERE') {
  console.error('❌ Please set your API_TOKEN in the script!');
  console.log('Get it from: Strapi Admin → Settings → API Tokens → Create new token');
  process.exit(1);
}

linkLogosViaAPI();