// heritageInferenceTypes.ts - הגדרות טיפוסים לכללי ההיסק
export interface InferenceRuleConfig {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  examples?: string[];
  searchTerms?: string[];
}

export interface HeritageInferenceConfig {
  version: string;
  description: string;
  lastUpdated: string;
  rules: InferenceRuleConfig[];
  globalSettings: {
    minConfidenceThreshold: number;
    maxInferenceDepth: number;
    enableSemanticPatterns: boolean;
    enableArchitectClusters: boolean;
    enablePeriodClusters: boolean;
  };
  usage: {
    description: string;
    howToUse: string[];
    activation: string;
  };
}
