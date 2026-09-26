export interface AtsCategoryV2 {
  score: number;
  maxScore: 25;
  percentage: number;
  evidence: string[];
  recommendations: string[];
}

export interface AtsEvidenceItem {
  category: 'contactAndStructure' | 'actionVerbsAndImpact' | 'quantification' | 'technicalDepth';
  rule: string;
  impact: number;
  description: string;
}

export interface AtsScoreReportV2 {
  overallScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  scoringVersion: 'ats_score_v2';
  categories: {
    contactAndStructure: AtsCategoryV2;
    actionVerbsAndImpact: AtsCategoryV2;
    quantification: AtsCategoryV2;
    technicalDepth: AtsCategoryV2;
  };
  evidence: AtsEvidenceItem[];
  recommendations: string[];
  evaluatedAt: string;
}

export interface ParsedDocumentSection {
  name: string;
  title: string;
  bullets: string[];
  rawText: string;
}

export interface OcrResult {
  text: string;
  confidence: number;
  isScanned: boolean;
  engine: 'native' | 'tesseract' | 'fallback';
}
