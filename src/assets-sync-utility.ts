// Assets Sync Utility
// This utility script helps synchronize assets between graphData-roots.json and meta-graph-config.json
// It ensures that all assets in graphData-roots.json are also present in the meta-graph-config.json nodes

import fs from 'fs';
import path from 'path';

interface Asset {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  name?: string;
  type?: string;
}

interface MetaGraphConfig {
  questions: any[];
  example_buttons: string[];
  meta_graph: {
    title: string;
    description: string;
    nodes: Asset[];
    edges: any[];
  };
}

/**
 * Synchronizes assets from graphData-roots.json to meta-graph-config.json
 * Returns statistics about the sync operation
 */
export async function syncAssetsToMetaGraph(): Promise<{
  added: number;
  existing: number;
  total: number;
}> {
  try {
    // Define file paths
    const rootDir = process.cwd();
    const graphDataPath = path.join(rootDir, 'data', 'graphData-roots.json');
    const metaGraphPath = path.join(rootDir, 'src', 'meta-graph-config.json');

    // Read source and target files
    const graphData = JSON.parse(fs.readFileSync(graphDataPath, 'utf8'));
    const metaGraphConfig: MetaGraphConfig = JSON.parse(
      fs.readFileSync(metaGraphPath, 'utf8')
    );

    // Extract asset IDs already in the meta-graph
    const existingAssetIds = new Set(
      metaGraphConfig.meta_graph.nodes
        .filter((node) => node.type === 'נכס')
        .map((node) => node.id)
    );

    let added = 0;
    let existing = existingAssetIds.size;

    // Process each asset in graphData-roots.json
    for (const assetId in graphData) {
      if (!existingAssetIds.has(assetId)) {
        const asset = graphData[assetId];
        
        // Create a new node for the meta-graph
        const newNode = {
          id: assetId,
          label: asset.title || assetId,
          type: 'נכס',
          title: asset.description || asset.title || assetId
        };

        // Add the node to the meta-graph
        metaGraphConfig.meta_graph.nodes.push(newNode);
        added++;
      }
    }

    // Save updated meta-graph-config.json if changes were made
    if (added > 0) {
      fs.writeFileSync(
        metaGraphPath,
        JSON.stringify(metaGraphConfig, null, 2),
        'utf8'
      );
      console.log(`Updated meta-graph-config.json with ${added} new assets`);
    } else {
      console.log('No new assets to add to meta-graph-config.json');
    }

    // Return statistics
    return {
      added,
      existing,
      total: added + existing
    };
  } catch (error) {
    console.error('Error synchronizing assets:', error);
    throw error;
  }
}

/**
 * Estimates token count for the meta-graph with the current configuration
 */
export async function checkMetaGraphTokens(): Promise<{
  tokenCount: number;
  withinRange: boolean;
}> {
  try {
    const { verifyMetaGraphTokenCount } = await import('./meta-graph-generator');
    return verifyMetaGraphTokenCount();
  } catch (error) {
    console.error('Error checking meta-graph tokens:', error);
    throw error;
  }
}

// Run the script if called directly (not imported)
if (require.main === module) {
  (async () => {
    try {
      // Synchronize assets
      console.log('Synchronizing assets from graphData-roots.json to meta-graph-config.json...');
      const syncResults = await syncAssetsToMetaGraph();
      console.log(`Sync completed: ${syncResults.added} assets added, ${syncResults.existing} existing assets, ${syncResults.total} total assets`);

      // Check token count
      console.log('Checking meta-graph token count...');
      const tokenCheck = await checkMetaGraphTokens();
      console.log(tokenCheck);
    } catch (error) {
      console.error('Error running the script:', error);
      process.exit(1);
    }
  })();
}
