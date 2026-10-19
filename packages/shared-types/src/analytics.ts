export enum FeedbackRating {
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
}

export enum FeedbackCategory {
  HALLUCINATION = 'hallucination',
  IRRELEVANT_CONTEXT = 'irrelevant_context',
  MISSING_INFORMATION = 'missing_information',
  OUTDATED = 'outdated',
  ACCURATE_HELPFUL = 'accurate_helpful',
  OTHER = 'other',
}

export interface IFeedback {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  rating: FeedbackRating;
  category: FeedbackCategory;
  userComment?: string;
  reviewedByAdmin: boolean;
  createdAt: string;
}

export interface ICreateFeedbackRequest {
  conversationId: string;
  messageId: string;
  rating: FeedbackRating;
  category: FeedbackCategory;
  userComment?: string;
}

/**
 * RAG Tri-Metric Evaluation Benchmark Score
 * Values range from 0.00 to 1.00
 */
export interface IRagEvaluationScore {
  faithfulness: number;     // Groundedness: Is the answer derived strictly from retrieved context?
  answerRelevance: number;  // Did the answer directly address the user's inquiry?
  contextRecall: number;    // Did the retrieved context contain all necessary ground-truth facts?
  compositeScore: number;   // Harmonic or weighted mean of tri-metrics
}

export interface IRagEvaluationRecord {
  id: string;
  benchmarkRunId: string;
  testQuery: string;
  groundTruthAnswer?: string;
  generatedAnswer: string;
  retrievedContextCount: number;
  scores: IRagEvaluationScore;
  evaluatedAt: string;
}

export interface IAnalyticsOverview {
  totalQueries: number;
  totalTokensConsumed: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  cacheHitRatePercentage: number;
  feedbackDistribution: {
    thumbsUp: number;
    thumbsDown: number;
    positivePercentage: number;
  };
}
