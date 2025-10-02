const fs = require('fs');
const path = require('path');
const tar = require('tar');
const FormData = require('form-data');

const STRAPI_URL = 'https://tasteful-cows-a58f824c90.strapiapp.com';
const API_TOKEN = '6d631142810404fa38db96ac317d3e9063dc260c4e16bbaa5d2700dabe3290d69caadbbf546148432774d6d5e27b2c683f4e80f47eebb4b446701a35699fa8ff17d00d7d9fc4cab4fafbc95a788bd8c5f266eca6a0c267cb8f8069d28610aa5409f523d22e6fb6a78db594899adea4815ddc85c1d9585650aaf77630b41985d3';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadFile(filePath) {
  const form = new FormData();
  const fileStream = fs.createReadStream(filePath);
  form.append('files', fileStream, path.basename(filePath));

  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data[0];
}

function cleanDomainData(domainData) {
  const cleaned = { ...domainData };
  delete cleaned.id;
  delete cleaned.documentId;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.publishedAt;
  delete cleaned.createdBy;
  delete cleaned.updatedBy;
  delete cleaned.logo; // Remove old logo URL
  return cleaned;
}

async function importDomain(domainData, logoId) {
  const cleanedData = cleanDomainData(domainData);
  
  if (logoId) {
    cleanedData.logo = logoId;
  }

  const response = await fetch(`${STRAPI_URL}/api/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: cleanedData })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('Extracting backup...');
  
  if (!fs.existsSync('./extracted')) {
    fs.mkdirSync('./extracted');
  }
  
  await tar.x({
    file: 'backup.tar.gz.tar.gz',
    cwd: './extracted'
  });

  console.log('Reading data...');
  
  const entitiesFile = path.join('./extracted', 'entities', 'entities_00001.jsonl');
  const entitiesData = fs.readFileSync(entitiesFile, 'utf8');
  const allEntities = entitiesData.trim().split('\n').map(line => JSON.parse(line));
  const domains = allEntities.filter(e => e.type === 'api::domain.domain');

  console.log(`Found ${domains.length} domains`);

  // Build map of logo files by domain name
  const assetsDir = path.join('./extracted', 'assets');
  const logoFiles = fs.readdirSync(assetsDir);
  
  console.log('Uploading logos...');
  const logoMap = new Map(); // domain name -> uploaded file ID

  for (const filename of logoFiles) {
    // Extract domain name from filename (e.g., "yellowstonefishing_72914d7cf5.png" -> "yellowstonefishing")
    const domainName = filename.split('_')[0];
    const filePath = path.join(assetsDir, filename);
    
    try {
      const uploaded = await uploadFile(filePath);
      logoMap.set(domainName, uploaded.id);
      console.log(`  Uploaded: ${domainName}`);
      await sleep(100);
    } catch (error) {
      console.error(`  Failed: ${filename} - ${error.message}`);
    }
  }

  console.log(`\nUploaded ${logoMap.size} logos`);
  console.log('Importing domains...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < domains.length; i++) {
    const entity = domains[i];
    const domainData = entity.data;
    const domainName = domainData.name;
    
    const logoId = logoMap.get(domainName);
    
    console.log(`[${i + 1}/${domains.length}] ${domainName} ${logoId ? '(with logo)' : '(no logo)'}`);
    
    try {
      await importDomain(domainData, logoId);
      successCount++;
      await sleep(150);
    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nComplete! Success: ${successCount}, Errors: ${errorCount}`);
}

main().catch(console.error);