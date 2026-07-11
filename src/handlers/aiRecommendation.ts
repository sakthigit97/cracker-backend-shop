import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { success, error } from "../libs/response";
import { AiRecommendationOrchestratorService } from "../services/aiRecommendationOrchestrator.service";
import { AiRecommendationRequest } from "../types/aiRecommendation.types";

const service = new AiRecommendationOrchestratorService();
export const handler: APIGatewayProxyHandlerV2 = async (event) => {

    try {

        let body: AiRecommendationRequest;

        try {

            body = event.body
                ? JSON.parse(event.body)
                : {} as AiRecommendationRequest;

        } catch {

            return error(
                "Invalid request body",
                400
            );

        }

        if (
            !body.budget ||
            Number(body.budget) <= 0
        ) {

            return error(
                "Budget is required",
                400
            );

        }
        body.budget = Number(body.budget);

        body.audiences = Array.isArray(body.audiences)
            ? body.audiences
            : [];

        body.crackerTypes = Array.isArray(body.crackerTypes)
            ? body.crackerTypes
            : [];

        body.noiseLevels = Array.isArray(body.noiseLevels)
            ? body.noiseLevels
            : [];

        body.timePreferences = Array.isArray(body.timePreferences)
            ? body.timePreferences
            : [];

        body.features = Array.isArray(body.features)
            ? body.features
            : [];

        console.log(
            "AI RECOMMENDATION REQUEST",
            JSON.stringify(body)
        );
        const result =
            await service.recommend(body);

        return success(result);

    } catch (err) {

        console.error(
            "AI Recommendation Error",
            JSON.stringify(err, Object.getOwnPropertyNames(err))
        );

        return error(
            "Failed to generate recommendations",
            500
        );

    }

};