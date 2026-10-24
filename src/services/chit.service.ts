import { randomUUID } from "crypto";
import { ChitError } from "../types/chit";
import type {
    ChitDiscountType,
    ChitInstallment,
    ChitMember,
    ChitScheme,
} from "../types/chit";
import { ChitRepository } from "../repo/chit.repo";
import { NotificationService } from "../utils/notification.service";

interface CreateChitInput {
    name: string;
    description?: string;
    packageAmount: number;
    discountType: ChitDiscountType;
    discountValue: number;
    monthlyAmount: number;
    joinDeadline: string;
    startDate: string;
    endDate: string;
    reminderDate: string;
}

function isDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function todayInIndia() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const datePart = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "";
    return `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
}

function addMonths(dateString: string, months: number) {
    const [year, month, day] = dateString.split("-").map(Number);
    const targetMonth = month - 1 + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    const targetDay = Math.min(day, lastDay);
    return [
        targetYear,
        String(normalizedMonth + 1).padStart(2, "0"),
        String(targetDay).padStart(2, "0"),
    ].join("-");
}

function money(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function installmentsFor(scheme: ChitScheme): ChitInstallment[] {
    const installments: ChitInstallment[] = [];
    let remaining = scheme.payableAmount;
    let offset = 0;
    while (remaining > 0) {
        if (offset >= 600) {
            throw new ChitError("A scheme cannot have more than 600 monthly installments.", 400);
        }
        const dueDate = addMonths(scheme.startDate, offset);
        if (dueDate > scheme.endDate) {
            throw new ChitError(
                "The payment end date does not allow enough monthly installments to reach the scheme amount.",
                400
            );
        }
        const amount = money(Math.min(scheme.monthlyAmount, remaining));
        installments.push({
            dueDate,
            amount,
            paidAmount: 0,
            status: "pending",
            paymentHistory: [],
        });
        remaining = money(remaining - amount);
        offset += 1;
    }
    return installments;
}

export class ChitService {
    constructor(
        private repo = new ChitRepository(),
        private notificationService = new NotificationService()
    ) { }

    async createScheme(input: CreateChitInput) {
        if (typeof input.name !== "string" || input.name.length > 100) {
            throw new ChitError("Scheme name must be a string of at most 100 characters.", 400);
        }
        if (
            input.description !== undefined &&
            (typeof input.description !== "string" || input.description.length > 300)
        ) {
            throw new ChitError("Description must be a string of at most 300 characters.", 400);
        }
        const name = input.name.trim();
        if (!name) throw new ChitError("Scheme name is required.", 400);
        if (!Number.isFinite(input.packageAmount) || input.packageAmount <= 0) {
            throw new ChitError("Package amount must be greater than zero.", 400);
        }
        if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0) {
            throw new ChitError("Monthly installment must be greater than zero.", 400);
        }
        if (money(input.monthlyAmount) <= 0) {
            throw new ChitError("Monthly installment must be at least ₹0.01.", 400);
        }
        if (!["flat", "percentage"].includes(input.discountType)) {
            throw new ChitError("Discount type must be flat or percentage.", 400);
        }
        if (!Number.isFinite(input.discountValue) || input.discountValue < 0) {
            throw new ChitError("Discount must be a valid non-negative amount.", 400);
        }
        if (input.discountType === "percentage" && input.discountValue > 100) {
            throw new ChitError("Percentage discount cannot exceed 100%.", 400);
        }
        if (input.discountType === "flat" && input.discountValue > input.packageAmount) {
            throw new ChitError("Flat discount cannot exceed the package amount.", 400);
        }
        for (const [label, value] of [
            ["Join deadline", input.joinDeadline],
            ["Payment start date", input.startDate],
            ["Payment end date", input.endDate],
            ["Reminder date", input.reminderDate],
        ]) {
            if (!isDate(value)) throw new ChitError(`${label} must be a valid date.`, 400);
        }
        const today = todayInIndia();
        if (input.joinDeadline < today) {
            throw new ChitError("Join deadline must be today or later.", 400);
        }
        if (input.startDate <= today) {
            throw new ChitError("Payment start date must be after today so members can join before payments begin.", 400);
        }
        if (input.joinDeadline >= input.startDate) {
            throw new ChitError("Join deadline must be before the payment start date.", 400);
        }
        if (input.endDate < input.startDate) {
            throw new ChitError("Payment end date must be on or after the payment start date.", 400);
        }
        if (input.reminderDate < input.startDate) {
            throw new ChitError("Reminder date must be on or after the payment start date.", 400);
        }
        if (input.reminderDate <= input.joinDeadline || input.reminderDate > input.endDate) {
            throw new ChitError("Reminder date must be after the join deadline and on or before the payment end date.", 400);
        }

        const discountAmount = input.discountType === "flat"
            ? input.discountValue
            : input.packageAmount * input.discountValue / 100;
        const payableAmount = money(input.packageAmount - discountAmount);
        if (payableAmount <= 0) {
            throw new ChitError("The discounted payable amount must be greater than zero.", 400);
        }

        const now = new Date().toISOString();
        const scheme: ChitScheme = {
            chitId: randomUUID(),
            recordId: "SCHEME",
            entityType: "SCHEME",
            name,
            ...(input.description?.trim()
                ? { description: input.description.trim() }
                : {}),
            packageAmount: money(input.packageAmount),
            discountType: input.discountType,
            discountValue: money(input.discountValue),
            payableAmount,
            monthlyAmount: money(input.monthlyAmount),
            joinDeadline: input.joinDeadline,
            startDate: input.startDate,
            endDate: input.endDate,
            reminderDate: input.reminderDate,
            createdAt: now,
            updatedAt: now,
        };
        installmentsFor(scheme);
        return this.repo.createScheme(scheme);
    }

    async listAvailableSchemes() {
        const today = todayInIndia();
        return (await this.repo.listSchemes())
            .filter((scheme) =>
                scheme.endDate >= today &&
                (scheme.joinDeadline >= today || scheme.startDate <= today)
            )
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    async listAdminSchemes() {
        return (await this.repo.listSchemes())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    async joinScheme(chitId: string, userId: string) {
        const scheme = await this.repo.getScheme(chitId);
        if (!scheme) throw new ChitError("Scheme not found.", 404);
        const today = todayInIndia();
        if (today > scheme.joinDeadline || today >= scheme.startDate) {
            throw new ChitError("The joining period for this scheme has closed.", 409);
        }
        if (today > scheme.endDate) {
            throw new ChitError("This scheme is no longer available to join.", 409);
        }
        const existing = await this.repo.getMember(chitId, userId);
        if (existing) throw new ChitError("You have already joined this scheme.", 409);
        const user = await this.repo.getUser(userId);
        if (!user) throw new ChitError("User profile not found.", 404);

        const now = new Date().toISOString();
        return this.repo.createMember({
            chitId,
            recordId: `MEMBER#${userId}`,
            entityType: "MEMBER",
            schemeId: chitId,
            userId,
            name: String(user.name ?? ""),
            phone: userId,
            ...(typeof user.email === "string" && user.email
                ? { email: user.email }
                : {}),
            joinedAt: now,
            payableAmount: scheme.payableAmount,
            totalPaid: 0,
            installments: installmentsFor(scheme),
            version: 1,
            updatedAt: now,
        });
    }

    async listMySchemes(userId: string) {
        const memberships = await this.repo.listMembersForUser(userId);
        return Promise.all(memberships.map(async (member) => ({
            member,
            scheme: await this.repo.getScheme(member.chitId),
        })));
    }

    async listMembers(chitId: string) {
        const scheme = await this.repo.getScheme(chitId);
        if (!scheme) throw new ChitError("Scheme not found.", 404);
        return {
            scheme,
            members: await this.repo.listMembers(chitId),
        };
    }

    async recordPayment(
        chitId: string,
        userId: string,
        input: { dueDate: string; amount: number; note?: string },
        adminId: string
    ) {
        if (!isDate(input.dueDate)) throw new ChitError("A valid installment due date is required.", 400);
        if (!Number.isFinite(input.amount) || input.amount <= 0) {
            throw new ChitError("Payment amount must be greater than zero.", 400);
        }
        if (money(input.amount) <= 0) {
            throw new ChitError("Payment amount must be at least ₹0.01.", 400);
        }
        if (
            input.note !== undefined &&
            (typeof input.note !== "string" || input.note.length > 120)
        ) {
            throw new ChitError("Payment note must be a string of at most 120 characters.", 400);
        }
        const member = await this.repo.getMember(chitId, userId);
        if (!member) throw new ChitError("Scheme member not found.", 404);
        const installmentIndex = member.installments.findIndex(
            (item) => item.dueDate === input.dueDate
        );
        if (installmentIndex < 0) throw new ChitError("Installment not found.", 404);

        const installment = member.installments[installmentIndex];
        const outstanding = money(installment.amount - installment.paidAmount);
        if (input.amount > outstanding) {
            throw new ChitError(`Payment cannot exceed the outstanding installment amount of ₹${outstanding}.`, 400);
        }
        if (member.installments.slice(0, installmentIndex).some((item) => item.status !== "paid")) {
            throw new ChitError("Record earlier installments before paying a later installment.", 409);
        }

        const now = new Date().toISOString();
        const paidAmount = money(installment.paidAmount + input.amount);
        const installments = member.installments.map((item, index) => index === installmentIndex
            ? {
                ...item,
                paidAmount,
                status: paidAmount >= item.amount ? "paid" as const : "partial" as const,
                paymentHistory: [...item.paymentHistory, {
                    amount: money(input.amount),
                    receivedAt: now,
                    receivedBy: adminId,
                    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
                }],
            }
            : item
        );
        return this.repo.updateMemberPayments({
            ...member,
            installments,
            totalPaid: money(member.totalPaid + input.amount),
            updatedAt: now,
        }, member.version);
    }

    async sendScheduledReminders() {
        const today = todayInIndia();
        const schemes = await this.repo.listSchemes();
        const results: { chitId: string; notified: number }[] = [];

        for (const scheme of schemes) {
            if (scheme.reminderDate > today) continue;
            const members = await this.repo.listMembers(scheme.chitId);
            let notified = 0;
            for (const member of members) {
                if (member.reminderSentAt) continue;
                const outstanding = money(member.payableAmount - member.totalPaid);
                if (outstanding <= 0) continue;
                const sent = await this.notificationService.send({
                    email: member.email,
                    phone: member.phone,
                    subject: `Payment reminder: ${scheme.name}`,
                    message:
                        `Reminder for ${scheme.name}: ₹${outstanding.toFixed(2)} remains ` +
                        `in your chit scheme. Please contact us to make your payment.`,
                    smsTemplateId: process.env.CHIT_REMINDER_TID || "",
                    smsVariables: {
                        SCHEMENAME: scheme.name,
                        AMOUNT: outstanding.toFixed(2),
                    },
                    smsFeature: "chitReminder",
                });
                if (!sent.emailSent && !sent.smsSent) {
                    continue;
                }
                await this.repo.markMemberReminderSent(
                    scheme.chitId,
                    member.userId,
                    new Date().toISOString()
                );
                notified += 1;
            }
            results.push({ chitId: scheme.chitId, notified });
        }
        return results;
    }
}
