// issue.transitions.ts
import { Types } from "mongoose";
import { IssueModel } from "../model/issue.model"; // adjust the path to your model

type Status =
    | "new"
    | "screening"
    | "scheduled"
    | "assigned"
    | "en_route"
    | "in_progress"
    | "on_hold_parts"
    | "on_hold_customer"
    | "awaiting_payment"
    | "resolved"
    | "closed"
    | "cancelled";

const TERMINAL: Status[] = ["closed", "cancelled"];

// Adjacency map of allowed transitions
const ALLOWED: Record<Status, Status[]> = {
    new: ["screening", "scheduled", "assigned", "cancelled"],
    screening: ["scheduled", "assigned", "cancelled"],
    scheduled: ["assigned", "cancelled"],
    assigned: ["en_route", "scheduled", "cancelled"],
    en_route: ["in_progress", "scheduled", "cancelled"],
    in_progress: ["on_hold_parts", "on_hold_customer", "awaiting_payment", "resolved", "cancelled"],
    on_hold_parts: ["in_progress", "cancelled"],
    on_hold_customer: ["in_progress", "cancelled"],
    awaiting_payment: ["resolved", "cancelled"],
    resolved: ["closed", "awaiting_payment", "in_progress", "cancelled"], // allow reopen or finalize
    closed: [],      // terminal
    cancelled: [],   // terminal
};

export class StatusTransitionError extends Error {
    code = "INVALID_STATUS_TRANSITION";
    http = 400;
    constructor(public from: Status, public to: Status) {
        super(`Cannot transition from "${from}" to "${to}".`);
    }
}

export async function transitionIssueStatus(params: {
    issueId: string;
    next: Status;
    by?: string;            // user id who performs the action
    note?: string;
}) {
    const { issueId, next, by, note } = params;

    const issue = await IssueModel.findById(issueId);
    if (!issue) throw new Error("Issue not found");

    const from = issue.status as Status;

    // Guard terminal states
    if (TERMINAL.includes(from)) {
        throw new StatusTransitionError(from, next);
    }

    // Guard adjacency
    const allowed = ALLOWED[from] || [];
    if (!allowed.includes(next)) {
        throw new StatusTransitionError(from, next);
    }

    // Mutate timestamps based on milestones (optional but handy)
    const now = new Date();
    if (next === "in_progress" && !issue.schedule?.arrivalAt) {
        issue.set("schedule.arrivalAt", now);
    }
    if (next === "resolved" && !issue.schedule?.completedAt) {
        issue.set("schedule.completedAt", now);
    }

    // Apply status
    issue.status = next;

    // History append
    issue.history.push({
        at: now,
        by: by ? new Types.ObjectId(by) : undefined,
        action: "status_changed",
        from,
        to: next,
        note,
    });

    await issue.save();
    return issue;
}

/** Optional helper to check without mutating */
export function canTransition(from: Status, to: Status) {
    return !TERMINAL.includes(from) && (ALLOWED[from] || []).includes(to);
}
