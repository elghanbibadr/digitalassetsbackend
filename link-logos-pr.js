const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'https://tasteful-cows-a58f824c90.strapiapp.com';
const API_TOKEN = '8474d183ebd36a66dcdb7a38f99a499a9d2aef055e5e8a8bb142f49d32088f372cee1cc628b8bbb2e169109c4b43e28af26dccfe515b90a634688aaf864b40e578e6107a4b46c2e0766fb03d6b43e6382f7d9306f0a507a3b1cf8a79a74420fcb428747832802141e445ae07d478e10dd05404700a485f39227072b124a92004'; // Replace with your production token

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUploadedFiles() {
  console.log('Fetching uploaded files...');
  
  const response = await fetch(
    `${STRAPI_URL}/api/upload/files?pagination[limit]=1000`,
    { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
  );
  
  if (!response.ok) {
    console.error('Failed to fetch files:', response.status);
    return new Map();
  }

  const files = await response.json();
  
  const fileMap = new Map();
  files.forEach(file => {
    const domainName = file.name.replace(/\.(png|jpg|jpeg|gif|svg|webp)$/i, '');
    fileMap.set(domainName, file.id);
  });
  
  console.log(`Mapped ${fileMap.size} logos`);
  console.log('Sample:', Array.from(fileMap.entries()).slice(0, 3));
  
  return fileMap;
}

async function getAllDomains() {
  const allDomains = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching all domains...');

  while (hasMore) {
    const response = await fetch(
      `${STRAPI_URL}/api/domains?pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
    );
    
    const data = await response.json();
    allDomains.push(...data.data);
    
    hasMore = data.meta.pagination.page < data.meta.pagination.pageCount;
    page++;
    
    console.log(`  Fetched ${allDomains.length} domains...`);
  }

  return allDomains;
}

async function updateDomain(documentId, logoId) {
  const response = await fetch(`${STRAPI_URL}/api/domains/${documentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { logo: logoId } })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log('PRODUCTION: Linking logos to domains...\n');
  
  const uploadedLogos = await getUploadedFiles();

  if (uploadedLogos.size === 0) {
    console.error('\nNo logos found! Check API token permissions.');
    return;
  }

  const domains = await getAllDomains();
  console.log(`\nUpdating ${domains.length} domains...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    const logoId = uploadedLogos.get(domain.name);
    
    // Skip if no logo or already has logo
    if (!logoId || domain.logo) {
      skippedCount++;
      continue;
    }
    
    console.log(`[${i + 1}/${domains.length}] ${domain.name}`);
    
    try {
      await updateDomain(domain.documentId, logoId);
      successCount++;
      await sleep(100); // Slower for production to avoid rate limits
    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== PRODUCTION Complete ===`);
  console.log(`Updated: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main().catch(console.error);