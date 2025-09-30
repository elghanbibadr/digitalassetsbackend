// Clean bulk delete script for Strapi domains

const STRAPI_URL = 'http://localhost:1337';
const BATCH_SIZE = 10;

async function deleteAllDomains() {
  try {
    let totalDeleted = 0;
    let batchCount = 0;
    
    while (true) {
      batchCount++;
      
      // Get domains for this batch
      const response = await fetch(`${STRAPI_URL}/api/domains?pagination[pageSize]=${BATCH_SIZE}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const { data: domains } = await response.json();
      
      // If no domains found, we're done
      if (domains.length === 0) {
        console.log('\n✅ No more domains found - deletion complete!');
        break;
      }
      
      console.log(`\n📦 Batch ${batchCount}: Processing ${domains.length} domains...`);
      
      // Delete each domain in this batch
      let batchDeleted = 0;
      for (const domain of domains) {
        console.log(`   🗑️  Deleting: ${domain.name} (ID: ${domain.id})`);
        
        const deleteResponse = await fetch(`${STRAPI_URL}/api/domains/${domain.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`   ✅ Successfully deleted: ${domain.name}`);
          batchDeleted++;
          totalDeleted++;
        } else {
          console.log(`   ❌ Failed to delete: ${domain.name} (Status: ${deleteResponse.status})`);
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`📊 Batch ${batchCount} completed: ${batchDeleted}/${domains.length} deleted. Total: ${totalDeleted}`);
      
      // If we got fewer domains than requested, we're probably done
      if (domains.length < BATCH_SIZE) {
        console.log('🏁 Reached end of domains (batch size smaller than expected)');
        break;
      }
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n🎉 COMPLETE! Successfully deleted ${totalDeleted} domains total.`);
    
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
  }
}

async function getDomainCount() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/domains?pagination[pageSize]=1`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { meta } = await response.json();
    return meta.pagination.total;
  } catch (error) {
    console.error('Error getting domain count:', error);
    return 0;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking current domain count...');
  const totalDomains = await getDomainCount();
  
  if (totalDomains === 0) {
    console.log('📭 No domains found in database.');
    return;
  }
  
  console.log(`📊 Found ${totalDomains} domains to delete.`);
  console.log('⚠️  This will delete ALL domains from your Strapi database.');
  console.log('🚀 Starting deletion process in 3 seconds...\n');
  
  // Give user a moment to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await deleteAllDomains();
  
  // Final verification
  const remainingDomains = await getDomainCount();
  console.log(`\n📋 Final count: ${remainingDomains} domains remaining in database.`);
}

main();