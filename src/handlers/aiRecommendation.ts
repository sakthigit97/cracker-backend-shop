import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { success, error } from "../libs/response";
import { AiRecommendationOrchestratorService } from "../services/aiRecommendationOrchestrator.service";

const service = new AiRecommendationOrchestratorService();
export const handler: APIGatewayProxyHandlerV2 = async (event) => {

    try {

        let body: any = {};

        try {
            body = event.body
                ? JSON.parse(event.body)
                : {};
        } catch {
            return error(
                "Invalid request body",
                400
            );
        }

        const query = body?.query?.trim();
        if (!query) {
            return error(
                "Query is required",
                400
            );
        }

        if (query.length > 500) {
            return error(
                "Query is too long",
                400
            );
        }

        const result =
            await service.recommend(
                query
            );

        return success(result);

    } catch (err: any) {

        console.error(
            "AI Recommendation Error",
            err
        );

        return error(
            "Failed to generate recommendations",
            500
        );
    }
};