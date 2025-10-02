const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const API_TOKEN = '20a8544224632fd0e080f017ad50a5d18203f7ec4defc59e90571d10ec0bb56e9c2f77c99cb1fcfae09584e0a02d735f1b97d7e5905f7ee36fd05f05de70d35e8baa4aea0cd36543e42ea8e63797231cf00719206b4036b1f4a1cdb5198a5cbc649adf39d9cd26291ebba4e514e3d47c662fb073b16a87bcd0b12d1f9302f6fa';

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
    console.error('Failed to fetch files');
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
  console.log('LOCAL: Linking logos to domains...\n');
  
  const uploadedLogos = await getUploadedFiles();

  if (uploadedLogos.size === 0) {
    console.error('\nNo logos found!');
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
      await sleep(50);
    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n=== LOCAL Complete ===`);
  console.log(`Updated: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main().catch(console.error);