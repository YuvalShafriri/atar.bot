// Meta-Graph Generator for All Assets Optimization
// This module generates a meta-graph representation of all assets
// to reduce token consumption from ~5500 to ~500 tokens

import { metaGraphConfig } from './meta-graph-config';

export interface MetaGraphData {
    title: string;
    description: string;
    nodes: Array<{
        id: string;
        label: string;
        type: string;
        title?: string;
    }>;
    edges: Array<{
        from: string;
        to: string;
        label?: string;
    }>;
}

export interface PresetQuestion {
    id: string;
    text: string;
    answer: string;
}

/**
 * Generates the meta-graph data for all assets
 * Returns a condensed representation with ~15-20 nodes instead of full graph
 */
export function generateMetaGraph(): MetaGraphData {
    return metaGraphConfig.meta_graph;
}

/**
 * Gets predefined questions and answers for common queries
 */
export function getPresetQuestions(): PresetQuestion[] {
    return metaGraphConfig.questions;
}

/**
 * Gets example button questions for the UI
 */
export function getExampleQuestions(): string[] {
    return metaGraphConfig.example_buttons;
}

/**
 * Verifies if the meta-graph token count is within target range (500-700 tokens)
 * Returns an object with token count and whether it's within range
 */
export function verifyMetaGraphTokenCount(): { tokenCount: number, withinRange: boolean, status: string } {
    const tokenCount = estimateTokenCount();
    const minTargetTokens = 500;
    const maxTargetTokens = 700;
    
    const withinRange = tokenCount >= minTargetTokens && tokenCount <= maxTargetTokens;
    
    let status: string;
    if (tokenCount < minTargetTokens) {
        status = `Token count (${tokenCount}) is below target range (${minTargetTokens}-${maxTargetTokens}). Consider adding more detailed information.`;
    } else if (tokenCount > maxTargetTokens) {
        status = `Token count (${tokenCount}) exceeds target range (${minTargetTokens}-${maxTargetTokens}). Consider simplifying or reducing the meta-graph.`;
    } else {
        status = `Good! Token count (${tokenCount}) is within target range (${minTargetTokens}-${maxTargetTokens}).`;
    }
    
    return { tokenCount, withinRange, status };
}

/**
 * Checks if a question matches a preset question and returns the answer
 */
export function getPresetAnswer(question: string): string | null {
    // התאמה מדויקת בלבד (ניקוי סימני שאלה ורווחים)
    const normalized = question.trim().replace(/[?؟]/g, '');
    const found = metaGraphConfig.questions.find(q =>
        q.text.trim().replace(/[?؟]/g, '') === normalized
    );
    return found ? found.answer.trim() : null;
}

/**
 * Generates a compact text representation of the meta-graph for LLM context
 * This should be around 500 tokens instead of 5500
 */
export function generateMetaGraphContext(): string {
    const metaGraph = generateMetaGraph();
    
    let context = `מטא-גרף של כל נכסי המורשת:\n\n`;
    context += `${metaGraph.title}\n`;
    context += `${metaGraph.description}\n\n`;
    
    // Group nodes by type for better organization
    const nodesByType: { [key: string]: any[] } = {};
    metaGraph.nodes.forEach(node => {
        if (!nodesByType[node.type]) {
            nodesByType[node.type] = [];
        }
        nodesByType[node.type].push(node);
    });
    
    // Add nodes by category
    Object.entries(nodesByType).forEach(([type, nodes]) => {
        context += `${type}:\n`;
        nodes.forEach(node => {
            context += `- ${node.label}${node.title ? ` (${node.title})` : ''}\n`;
        });
        context += '\n';
    });
    
    // Add key relationships
    context += `קשרים עיקריים:\n`;
    metaGraph.edges.forEach(edge => {
        const fromNode = metaGraph.nodes.find(n => n.id === edge.from);
        const toNode = metaGraph.nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
            context += `- ${fromNode.label} ${edge.label || '→'} ${toNode.label}\n`;
        }
    });
    
    return context;
}

/**
 * Estimates token count for the meta-graph context
 * Hebrew: ~3-4 characters per token, English: ~4 characters per token
 */
export function estimateTokenCount(): number {
    const context = generateMetaGraphContext();
    // Conservative estimate: 3.5 characters per token for mixed Hebrew/English
    return Math.ceil(context.length / 3.5);
}
