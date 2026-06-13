import { IntentParser } from "./intentParser.interface";
import { RecommendationIntent } from "../types/recommendation.types";
import { TAG_SYNONYMS } from "../constants/tagSynonyms";

export class RegexIntentParser implements IntentParser {

    async parse(query: string): Promise<RecommendationIntent> {

        const normalized = query.toLowerCase();
        const budgetMatch =
            normalized.match(/₹\s*(\d+)/i) ||
            normalized.match(/rs\.?\s*(\d+)/i) ||
            normalized.match(/under\s*(\d+)/i) ||
            normalized.match(/below\s*(\d+)/i) ||
            normalized.match(/budget\s*(\d+)/i) ||
            normalized.match(/\b(\d{3,6})\b/);

        const budget = budgetMatch
            ? Number(budgetMatch[1])
            : null;

        const tags = new Set<string>();
        Object.entries(TAG_SYNONYMS).forEach(
            ([keyword, tag]) => {
                if (normalized.includes(keyword)) {
                    tags.add(tag);
                }
            }
        );

        const missingFields: string[] = [];
        if (!budget) {
            missingFields.push("budget");
        }
        return {
            budget,
            tags: Array.from(tags),
            missingFields,
        };
    }
}