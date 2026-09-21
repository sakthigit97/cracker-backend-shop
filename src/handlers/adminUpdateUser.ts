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

        const mobile = event.pathParameters?.mobile;
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

        const allowedFields = [
            "name",
            "role",
            "address",
            "city",
            "state",
            "district",
            "pincode",
            "walletCredit",
            "chitBalance",
            "isBulkUser",
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
                        "Only name, role, address, city, state, district, pincode, walletCredit, chitBalance and isBulkUser can be updated",
                }),
            };
        }

        const input: {
            name?: string;
            role?: string;
            address?: string;
            city?: string;
            state?: string;
            district?: string;
            pincode?: string;
            walletCredit?: number;
            chitBalance?: number;
            isBulkUser?: boolean;
        } = {};

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

            if (
                roleValue !== "user" &&
                roleValue !== "admin" &&
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

        if (body.district !== undefined) {
            if (
                typeof body.district !== "string"
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "District must be a string",
                    }),
                };
            }

            input.district =
                body.district.trim();
        }

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

            const pincode = body.pincode.trim();
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

        if (body.walletCredit !== undefined) {
            if (
                typeof body.walletCredit !== "number" ||
                !Number.isFinite(body.walletCredit) ||
                body.walletCredit < 0
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Wallet credit must be a valid non-negative number",
                    }),
                };
            }

            input.walletCredit = body.walletCredit;
        }

        if (body.chitBalance !== undefined) {
            if (
                typeof body.chitBalance !== "number" ||
                !Number.isFinite(body.chitBalance) ||
                body.chitBalance < 0
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "Chit balance must be a valid non-negative number",
                    }),
                };
            }

            input.chitBalance = body.chitBalance;
        }

        if (body.isBulkUser !== undefined) {
            if (typeof body.isBulkUser !== "boolean") {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message:
                            "isBulkUser must be a boolean",
                    }),
                };
            }

            input.isBulkUser = body.isBulkUser;
        }

        const hasUpdate =
            input.name !== undefined ||
            input.role !== undefined ||
            input.address !== undefined ||
            input.city !== undefined ||
            input.district !== undefined ||
            input.state !== undefined ||
            input.pincode !== undefined ||
            input.walletCredit !== undefined ||
            input.chitBalance !== undefined ||
            input.isBulkUser !== undefined;

        if (!hasUpdate) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message:
                        "At least one field is required",
                }),
            };
        }

        const user = await service.updateUser(
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