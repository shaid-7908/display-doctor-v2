import mongoose, { Schema, model } from "mongoose";
import { z } from "zod";

/** ---------------------------
 * Zod validation (create/update)
 * --------------------------- */
export const issueCreateSchema = z.object({
    // Who/what it's for
    customerId: z.string().optional(), // optional because caller may create before user signup
    contact: z.object({
        name: z.string().min(2),
        phone: z.string().regex(/^\d{10}$/),
        email: z.string().email().optional(),
        address: z.object({
            line1: z.string().min(3),
            landmark: z.string().optional(),
            city: z.string().min(2),
            state: z.string().min(2),
            pinCode: z.string().regex(/^\d{6}$/),
            geo: z.object({
                lat: z.number().optional(),
                lng: z.number().optional(),
            }).optional(),
        }),
    }),

    // Service taxonomy (future-ready beyond TV repair)
    serviceCategoryId: z.string().optional(),
    serviceSubCategoryId: z.string().optional(),

    // Device details
    device: z.object({
        type: z.enum(["tv"]).default("tv"), // add more later: fridge, ac, etc.
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        warrantyStatus: z.enum(["in_warranty", "out_of_warranty"]).optional(),
    }),

    // Problem & media
    problemDescription: z.string().min(5),
    photos: z.array(z.string().url()).optional(),

    // Source channel & metadata
    source: z.enum(["customer_portal", "call_center", "social_ad", "website", "whatsapp", "referral"]).default("call_center"),
    campaignId: z.string().optional(),

    // Priority/SLA
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export type CreateIssueInput = z.infer<typeof issueCreateSchema>;

/** ---------------------------
 * Mongoose types
 * --------------------------- */
export interface IssueDocument extends mongoose.Document {
    human_readable_id: string;
    customerId?: mongoose.Types.ObjectId;
    generic_problem_type:string[];
    contact: {
        name: string;
        phone: string;
        email?: string;
        address: {
            line1: string;
            landmark?: string;
            city: string;
            state: string;
            pinCode: string;
            geo?: { lat?: number; lng?: number };
        };
    };

    serviceCategoryId?: mongoose.Types.ObjectId;
    serviceSubCategoryId?: mongoose.Types.ObjectId[];

    device: {
        type: "tv" | string;
        brand?: string;
        model?: string;
        serialNumber?: string;
        warrantyStatus?: "in_warranty" | "out_of_warranty";
    };

    problemDescription: string;
    photos?: string[];

    source: "customer_portal" | "call_center" | "social_ad" | "website" | "whatsapp" | "referral";
    campaignId?: string;

    status:
    | "new"
    | "screening"         // optional first QA call
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

    priority: "low" | "normal" | "high" | "urgent";

    // Assignment & scheduling
    assignment?: {
        technicianId?: mongoose.Types.ObjectId; // ref: users (role=technician)
        assignedBy?: mongoose.Types.ObjectId;   // ref: users
        assignedAt?: Date;
        notes?: string;
    };

    schedule?: {
        preferredDate?: Date;                 // customer preference
        window?: "morning" | "afternoon" | "evening" | "any";
        scheduledStart?: Date;                // confirmed slot
        scheduledEnd?: Date;
        arrivalAt?: Date;
        completedAt?: Date;
    };

    // SLA
    sla?: {
        responseDueAt?: Date; // first touch due
        resolutionDueAt?: Date;
        breachedAt?: Date;
        isBreached?: boolean;
    };

    // Work/Costing
    diagnosis?: {
        notes?: string;
        estimateAmount?: number; // rough estimate given to customer
        visitFee?: number;
    };

    resolution?: {
        notes?: string;
        partsUsed?: {
            name: string;     // or ref to parts collection later
            qty: number;
            unitPrice: number;
        }[];
        laborCharge?: number;
        discount?: number;
        totalAmount?: number; // computed or stored
    };

    payment?: {
        status: "unpaid" | "partial" | "paid" | "refunded";
        method?: "cash" | "upi" | "card" | "bank_transfer";
        transactionId?: string;
        collectedBy?: mongoose.Types.ObjectId; // ref: users
        collectedAt?: Date;
    };

    // Feedback
    feedback?: {
        rating?: number; // 1..5
        comment?: string;
        collectedAt?: Date;
    };

    // Audit trail
    history: {
        at: Date;
        by?: mongoose.Types.ObjectId; // ref: users
        action:
        | "created"
        | "status_changed"
        | "assigned"
        | "schedule_updated"
        | "note_added"
        | "cost_updated"
        | "payment_updated"
        | "feedback_added";
        from?: string;
        to?: string;
        note?: string;
    }[];

    createdBy: {
        userId?: mongoose.Types.ObjectId; // who created the ticket (caller/admin/customer)
        role: "customer" | "caller" | "admin" | "manager" | "technician";
    };

    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IssueModel extends mongoose.Model<IssueDocument> {
    generateIssueCode(): Promise<string>;
}

/** ---------------------------
 * Mongoose schema
 * --------------------------- */
const issueSchema = new Schema<IssueDocument, IssueModel>(
    {
        human_readable_id: { type: String, required: true, unique: true }, // e.g., ISS25xxxxx

        customerId: { type: Schema.Types.ObjectId, ref: "users" },
        generic_problem_type:[
            {type:String ,enum:["display_issue","sound_issue","power_issue","unknown_issue"],}
        ],
        contact: {
            name: { type: String, required: true },
            phone: { type: String, required: true },
            email: { type: String },
            address: {
                line1: { type: String, required: true },
                landmark: { type: String },
                city: { type: String, required: true },
                state: { type: String, required: true },
                pinCode: { type: String, required: true },
                geo: {
                    lat: { type: Number },
                    lng: { type: Number },
                },
            },
        },

        serviceCategoryId: { type: Schema.Types.ObjectId, ref: "serviceCategories" },
        serviceSubCategoryId: { type: [Schema.Types.ObjectId], ref: "serviceSubCategories" },

        device: {
            type: { type: String, default: "tv" },
            brand: { type: String },
            model: { type: String },
            serialNumber: { type: String },
            warrantyStatus: { type: String, enum: ["in_warranty", "out_of_warranty"] },
        },

        problemDescription: { type: String, required: true },
        photos: [{ type: String }],

        source: {
            type: String,
            enum: ["customer_portal", "call_center", "social_ad", "website", "whatsapp", "referral"],
            default: "call_center",
            index: true,
        },
        campaignId: { type: String },

        status: {
            type: String,
            enum: [
                "new",
                "screening",
                "scheduled",
                "assigned",
                "en_route",
                "in_progress",
                "on_hold_parts",
                "on_hold_customer",
                "awaiting_payment",
                "resolved",
                "closed",
                "cancelled",
            ],
            default: "new",
            index: true,
        },

        priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },

        assignment: {
            technicianId: { type: Schema.Types.ObjectId, ref: "users", index: true },
            assignedBy: { type: Schema.Types.ObjectId, ref: "users" },
            assignedAt: { type: Date },
            notes: { type: String },
        },

        schedule: {
            preferredDate: { type: Date },
            window: { type: String, enum: ["morning", "afternoon", "evening", "any"], default: "any" },
            scheduledStart: { type: Date },
            scheduledEnd: { type: Date },
            arrivalAt: { type: Date },
            completedAt: { type: Date },
        },

        sla: {
            responseDueAt: { type: Date },
            resolutionDueAt: { type: Date },
            breachedAt: { type: Date },
            isBreached: { type: Boolean, default: false },
        },

        diagnosis: {
            notes: { type: String },
            estimateAmount: { type: Number },
            visitFee: { type: Number },
        },

        resolution: {
            notes: { type: String },
            partsUsed: [
                {
                    name: { type: String, required: true },
                    qty: { type: Number, required: true },
                    unitPrice: { type: Number, required: true },
                },
            ],
            laborCharge: { type: Number },
            discount: { type: Number, default: 0 },
            totalAmount: { type: Number },
        },

        payment: {
            status: { type: String, enum: ["unpaid", "partial", "paid", "refunded"], default: "unpaid", index: true },
            method: { type: String, enum: ["cash", "upi", "card", "bank_transfer"] },
            transactionId: { type: String },
            collectedBy: { type: Schema.Types.ObjectId, ref: "users" },
            collectedAt: { type: Date },
        },

        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String },
            collectedAt: { type: Date },
        },

        history: [
            {
                at: { type: Date, required: true, default: () => new Date() },
                by: { type: Schema.Types.ObjectId, ref: "users" },
                action: {
                    type: String,
                    enum: [
                        "created",
                        "status_changed",
                        "assigned",
                        "schedule_updated",
                        "note_added",
                        "cost_updated",
                        "payment_updated",
                        "feedback_added",
                    ],
                    required: true,
                },
                from: { type: String },
                to: { type: String },
                note: { type: String },
            },
        ],

        createdBy: {
            userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
            role: { type: String, enum: ["customer", "caller", "admin", "manager", "technician"], required: true },
        },

        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

/** ---------------------------
 * Code generator: ISS<YY><#####>
 * --------------------------- */
issueSchema.statics.generateIssueCode = async function (): Promise<string> {
    const prefix = "ISS";
    const year = new Date().getFullYear().toString().slice(-2);

    const latest = await IssueModel.findOne({
        human_readable_id: { $regex: `^${prefix}${year}` },
    })
        .sort({ human_readable_id: -1 })
        .lean();

    let seq = 1;
    if (latest?.human_readable_id) {
        const last = parseInt(latest.human_readable_id.slice(-5));
        if (!Number.isNaN(last)) seq = last + 1;
    }

    return `${prefix}${year}${seq.toString().padStart(5, "0")}`;
};

/** Auto-generate ID on create */
issueSchema.pre("validate", async function (next) {
    const doc = this as unknown as IssueDocument & { constructor: IssueModel };
    if (!doc.human_readable_id) {
        // @ts-ignore - static method available on model
        doc.human_readable_id = await (doc.constructor as IssueModel).generateIssueCode();
    }
    next();
});

/** Useful indexes for dashboards & assignments */
issueSchema.index({ createdAt: -1 });
issueSchema.index({ customerId: 1, createdAt: -1 });
issueSchema.index({ "assignment.technicianId": 1, status: 1 });
issueSchema.index({ source: 1, campaignId: 1 });
issueSchema.index({ status: 1, priority: 1 });

export const IssueModel = model<IssueDocument, IssueModel>("issues", issueSchema);
