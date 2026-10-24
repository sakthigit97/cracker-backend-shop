import { ChitError } from "../types/chit";
import { ChitService } from "../services/chit.service";
import { verifyJwt } from "../utils/auth";

const service = new ChitService();

function response(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

function failure(error: unknown) {
    if (error instanceof ChitError) {
        return response(error.statusCode, { message: error.message });
    }
    if (
        error instanceof Error &&
        (error.message === "Missing Authorization header" ||
            error.message === "Invalid token payload" ||
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError")
    ) {
        return response(401, { message: "Unauthorized." });
    }
    if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "ConditionalCheckFailedException"
    ) {
        return response(409, { message: "This record changed or already exists. Refresh and try again." });
    }
    console.error("Chit request failed", error);
    return response(500, { message: "Unable to complete the chit request." });
}

function parseBody(event: any) {
    try {
        return JSON.parse(event.body || "{}");
    } catch {
        throw new ChitError("Request body must be valid JSON.", 400);
    }
}

function requireRole(event: any, role: "admin" | "user") {
    const payload = verifyJwt(event);
    if (String(payload.role).toLowerCase() !== role) {
        throw new ChitError("Forbidden.", 403);
    }
    return payload;
}

export const createScheme = async (event: any) => {
    try {
        requireRole(event, "admin");
        const body = parseBody(event);
        const scheme = await service.createScheme({
            name: body.name,
            description: body.description,
            packageAmount: Number(body.packageAmount),
            discountType: body.discountType,
            discountValue: Number(body.discountValue),
            monthlyAmount: Number(body.monthlyAmount),
            joinDeadline: body.joinDeadline,
            startDate: body.startDate,
            endDate: body.endDate,
            reminderDate: body.reminderDate,
        });
        return response(201, scheme);
    } catch (error) {
        return failure(error);
    }
};

export const listSchemes = async (event: any) => {
    try {
        requireRole(event, "admin");
        return response(200, await service.listAdminSchemes());
    } catch (error) {
        return failure(error);
    }
};

export const listAvailableSchemes = async (event: any) => {
    try {
        requireRole(event, "user");
        return response(200, await service.listAvailableSchemes());
    } catch (error) {
        return failure(error);
    }
};

export const joinScheme = async (event: any) => {
    try {
        const { userId } = requireRole(event, "user");
        const chitId = event.pathParameters?.chitId;
        if (!chitId) throw new ChitError("Scheme ID is required.", 400);
        return response(201, await service.joinScheme(chitId, userId));
    } catch (error) {
        return failure(error);
    }
};

export const listMySchemes = async (event: any) => {
    try {
        const { userId } = requireRole(event, "user");
        return response(200, await service.listMySchemes(userId));
    } catch (error) {
        return failure(error);
    }
};

export const listMembers = async (event: any) => {
    try {
        requireRole(event, "admin");
        const chitId = event.pathParameters?.chitId;
        if (!chitId) throw new ChitError("Scheme ID is required.", 400);
        return response(200, await service.listMembers(chitId));
    } catch (error) {
        return failure(error);
    }
};

export const recordPayment = async (event: any) => {
    try {
        const { userId: adminId } = requireRole(event, "admin");
        const { chitId, userId } = event.pathParameters ?? {};
        if (!chitId || !userId) {
            throw new ChitError("Scheme ID and member ID are required.", 400);
        }
        const body = parseBody(event);
        const member = await service.recordPayment(
            chitId,
            userId,
            {
                dueDate: body.dueDate,
                amount: Number(body.amount),
                note: body.note,
            },
            adminId
        );
        return response(200, member);
    } catch (error) {
        return failure(error);
    }
};

export const sendScheduledReminders = async () => {
    try {
        return response(200, await service.sendScheduledReminders());
    } catch (error) {
        return failure(error);
    }
};
