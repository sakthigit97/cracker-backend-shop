import { verifyToken } from "./jwt";
import { error } from "./response";

export const withAuth = (handler: any) => {
  return async (event: any) => {
    try {
      const authHeader =
        event.headers?.authorization ||
        event.headers?.Authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return error("Unauthorized", 401);
      }

      const token = authHeader.split(" ")[1];
      const payload = verifyToken(token);
      event.user = payload;

      return handler(event);
    } catch (err) {
      return error("Invalid or expired token", 401);
    }
  };
};