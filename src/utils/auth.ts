import jwt from "jsonwebtoken";

export interface JwtPayload {
    userId: string;
    role: string;
    iat: number;
    exp: number;
}

export function verifyJwt(event: any): JwtPayload {
    const authHeader =
        event.headers?.authorization ||
        event.headers?.Authorization;

    if (!authHeader) {
        throw new Error("Missing Authorization header");
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not configured");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
    ) as any;

    const userId = decoded.sub || decoded.userId;

    if (!userId) {
        throw new Error("Invalid token payload");
    }

    return {
        userId,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
    };
}

export function getOptionalUserId(
    event: any
): string | null {
    try {
        const payload = verifyJwt(event);
        return payload.userId;
    } catch {
        return null;
    }
}