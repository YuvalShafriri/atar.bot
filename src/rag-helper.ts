import { pipeline, cos_sim } from '@xenova/transformers';

// A singleton class to ensure we only load the model once.
class EmbeddingPipeline {
    static task = 'feature-extraction' as const;
    static model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
    static instance: any = null;

    static async getInstance(progress_callback: any = null) {
        if (this.instance === null) {
            console.log('Loading embedding model for the first time...');
            this.instance = await pipeline('feature-extraction', this.model, { progress_callback });
            console.log('Embedding model loaded.');
        }
        return this.instance;
    }
}

// Simple in-memory cache for document embeddings
const embeddingsCache = new Map<string, any>();

// Function to chunk the graph data into searchable text pieces
function createTextChunks(allGraphData: Record<string, any>): { id: string, text: string }[] {
    const chunks: { id: string, text: string }[] = [];
    for (const assetId in allGraphData) {
        const asset = allGraphData[assetId];
        let assetText = `נכס: ${asset.title}. תיאור: ${asset.description}.`;
        
        const nodesText = (asset.nodes || []).map((n: any) => `${n.label} (סוג: ${n.type}, תיאור: ${n.title || 'אין'})`).join(', ');
        if (nodesText) assetText += ` צמתים: ${nodesText}.`;

        const edgesText = (asset.edges || []).map((e: any) => {
            const fromNode = (asset.nodes || []).find((n: any) => n.id === e.from)?.label;
            const toNode = (asset.nodes || []).find((n: any) => n.id === e.to)?.label;
            if (fromNode && toNode) return `קשר: "${fromNode}" ל-"${toNode}" (${e.label || 'ללא תווית'})`;
            return '';
        }).filter(Boolean).join(', ');
        if (edgesText) assetText += ` קשרים: ${edgesText}.`;
        
        chunks.push({ id: assetId, text: assetText });
    }
    // Log all chunks for debugging
    console.log('RAG: All generated chunks:', chunks);
    return chunks;
}

// Main RAG function
export async function getRelevantContext(question: string, allGraphData: Record<string, any>): Promise<string> {
    console.log("Starting RAG process for 'all_assets'...");
    const extractor = await EmbeddingPipeline.getInstance();

    const chunks = createTextChunks(allGraphData);
    
    // Generate embeddings for all chunks if not already cached
    if (embeddingsCache.size === 0) {
        console.log(`Generating ${chunks.length} embeddings for graph data...`);
        const chunkTexts = chunks.map(c => c.text);
        const chunkEmbeddings = await extractor(chunkTexts, { pooling: 'mean', normalize: true });
        chunks.forEach((chunk, i) => {
            embeddingsCache.set(chunk.id, { text: chunk.text, embedding: chunkEmbeddings[i].data });
        });
        console.log('Embeddings generated and cached.');
    }

    // Generate embedding for the user's question
    console.log('Generating embedding for the question...');
    const questionEmbedding = await extractor(question, { pooling: 'mean', normalize: true });

    // Calculate similarity and find the top N most relevant chunks
    const similarities: { id: string, score: number }[] = [];
    for (const [id, data] of embeddingsCache.entries()) {
        const score = cos_sim(questionEmbedding.data, data.embedding);
        similarities.push({ id, score });
    }

    similarities.sort((a, b) => b.score - a.score);
    
    // Get the top 3 most relevant chunks
    const topN = 3;
    const relevantChunks = similarities.slice(0, topN).map(sim => {
        return embeddingsCache.get(sim.id).text;
    });

    // Log selected chunks for this query
    console.log('RAG: Top relevant chunks for query:', question, relevantChunks);

    console.log(`Found ${relevantChunks.length} relevant context chunks.`);
    const context = relevantChunks.join('\n\n---\n\n');
    return context;
}
