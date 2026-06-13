import { RecommendationIntent } from "../types/recommendation.types";

export interface IntentParser {
    parse(query: string): Promise<RecommendationIntent>;
}