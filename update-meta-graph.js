// Run the assets sync utility and verify meta-graph token count
import { syncAssetsToMetaGraph, checkMetaGraphTokens } from './src/assets-sync-utility';
import { verifyMetaGraphTokenCount } from './src/meta-graph-generator';

async function main() {
  try {
    console.log('=== Meta-Graph Assets Sync Utility ===\n');
    
    // Step 1: Synchronize assets from graphData-roots.json to meta-graph-config.json
    console.log('Step 1: Synchronizing assets...');
    const syncResults = await syncAssetsToMetaGraph();
    console.log(`✓ Sync completed: ${syncResults.added} assets added, ${syncResults.existing} existing assets, ${syncResults.total} total assets\n`);
    
    // Step 2: Check if the token count is within the target range (500-700 tokens)
    console.log('Step 2: Verifying token count...');
    const tokenResults = verifyMetaGraphTokenCount();
    console.log(`✓ ${tokenResults.status}\n`);
    
    if (!tokenResults.withinRange) {
      console.log('⚠️ Token count needs adjustment!');
      console.log('Consider editing the meta-graph-config.json file to adjust the token count.\n');
    }
    
    console.log('=== Process completed ===');
  } catch (error) {
    console.error('Error running the utility:', error);
    process.exit(1);
  }
}

main();
