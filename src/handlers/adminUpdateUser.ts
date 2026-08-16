import { verifyJwt } from "../utils/auth";
import { AdminUserService } from "../services/adminUser.service";

const service = new AdminUserService();

export const handler = async (event: any) => {
    try {
        const { role } = verifyJwt(event);

        if (role !== "admin") {
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }

        const mobile =
            event.pathParameters?.mobile;

        if (!mobile?.trim()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Mobile number is required",
                }),
            };
        }

        let body: any;

        try {
            body = event.body
                ? JSON.parse(event.body)
                : {};
        } catch {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Invalid JSON body",
                }),
            };
        }

        /*
         * Only these fields are allowed to be
         * updated through this admin API.
         *
         * Mobile number is the DynamoDB key,
         * so it cannot be changed.
         */
        const allowedFields = [
            "name",
            "role",
            "address",
            "city",
            "state",
            "pincode",
        ];

        const hasUnknownField =
            Object.keys(body).some(
                (key) =>
                    !allowedFields.includes(key)
            );

        if (hasUnknownField) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "Only name, role, address, city, state and pincode can be updated",
                }),
            };
        }

        const input: {
            name?: string;
            role?: string;
            address?: string;
            city?: string;
            state?: string;
            pincode?: string;
        } = {};

        /*
         * Name
         */
        if (body.name !== undefined) {
            if (
                typeof body.name !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Name must be a string",
                    }),
                };
            }

            input.name =
                body.name.trim();
        }

        /*
         * Role
         */
        if (body.role !== undefined) {
            if (
                typeof body.role !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Role must be a string",
                    }),
                };
            }

            const roleValue =
                body.role.trim();

            /*
             * Keep this restricted to the roles
             * currently supported by the application.
             */
            if (
                roleValue !== "user" &&
                roleValue !== "admin"&&
                roleValue !== "staff"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Role must be either user or admin or staff",
                    }),
                };
            }

            input.role = roleValue;
        }

        /*
         * Address
         */
        if (body.address !== undefined) {
            if (
                typeof body.address !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Address must be a string",
                    }),
                };
            }

            input.address =
                body.address.trim();
        }

        /*
         * City
         */
        if (body.city !== undefined) {
            if (
                typeof body.city !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "City must be a string",
                    }),
                };
            }

            input.city =
                body.city.trim();
        }

        /*
         * State
         */
        if (body.state !== undefined) {
            if (
                typeof body.state !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "State must be a string",
                    }),
                };
            }

            input.state =
                body.state.trim();
        }

        /*
         * Pincode
         */
        if (body.pincode !== undefined) {
            if (
                typeof body.pincode !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Pincode must be a string",
                    }),
                };
            }

            const pincode =
                body.pincode.trim();

            if (
                !/^\d{6}$/.test(pincode)
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Pincode must be a valid 6-digit number",
                    }),
                };
            }

            input.pincode = pincode;
        }

        /*
         * At least one field must be supplied.
         */
        const hasUpdate =
            input.name !== undefined ||
            input.role !== undefined ||
            input.address !== undefined ||
            input.city !== undefined ||
            input.state !== undefined ||
            input.pincode !== undefined;

        if (!hasUpdate) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "At least one field is required",
                }),
            };
        }

        const user =
            await service.updateUser(
                mobile.trim(),
                input
            );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    "User updated successfully",
                user,
            }),
        };
    } catch (error: any) {
        console.error(
            "AdminUpdateUser error",
            error
        );

        if (
            error?.name ===
            "ConditionalCheckFailedException"
        ) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message:
                        "User not found",
                }),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message:
                    "Internal Server Error",
            }),
        };
    }
};