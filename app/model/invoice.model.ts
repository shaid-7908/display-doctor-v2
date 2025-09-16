import { Document, Types, Schema, model } from "mongoose";

export interface IInvoice extends Document {
    issueId: Types.ObjectId,
    issue_report_id: Types.ObjectId,
    human_readable_issue_id: String,
    serviceCategoryId: Types.ObjectId,
    deviceType: String,
    deviceModel: String,
    deviceBrand: String,
    deviceSerial: String,
    serviceDescription: String,
    partsUsed: String,
    finalQuotation: Number,
    customerName: String,
    customerPhone: String,
    customerAddress: String,
    customerEmail: String,
    warrantyMonths: String,
    warrantyStart: Date,
    warrantyEnd: Date,
    invoiceDate: Date,
    labourCharge: Number,
    partsCost: Number,
    visitCharge: Number,
    discount: Number,
    finalAmount: Number,
    human_readable_invoice_id: String,
    status: String
}

const invoiceSchema = new Schema<IInvoice>({
    issueId: { type: Schema.Types.ObjectId, ref: 'issues' },
    issue_report_id: { type: Schema.Types.ObjectId, ref: 'issue_reports' },
    human_readable_issue_id: { type: String, ref: 'issues' },
    serviceCategoryId: { type: Schema.Types.ObjectId, ref: 'serviceCategories' },
    deviceType: { type: String, required: true },
    deviceModel: { type: String, required: true },
    deviceBrand: { type: String, required: true },
    deviceSerial: { type: String, required: true },
    serviceDescription: { type: String, required: true },
    partsUsed: { type: String, required: true },
    finalQuotation: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerEmail: { type: String, required: true },
    warrantyMonths: { type: String, required: true },
    warrantyStart: { type: Date, required: true },
    warrantyEnd: { type: Date, required: true },
    invoiceDate: { type: Date, required: true },
    labourCharge: { type: Number, required: true },
    partsCost: { type: Number, required: true },
    visitCharge: { type: Number, required: true },
    discount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    human_readable_invoice_id: { type: String, unique: true },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
}, { timestamps: true });

// Auto-generate human readable invoice ID before saving
invoiceSchema.pre('save', async function (next) {
    if (!this.human_readable_invoice_id) {
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

        // Find the latest invoice for the current month to get the next sequence number
        const InvoiceModel = this.constructor as any;
        const latestInvoice = await InvoiceModel.findOne({
            human_readable_invoice_id: new RegExp(`^INV-${currentYear}${currentMonth}-`)
        }).sort({ human_readable_invoice_id: -1 });

        let sequenceNumber = 1;
        if (latestInvoice && latestInvoice.human_readable_invoice_id) {
            const match = latestInvoice.human_readable_invoice_id.match(/INV-\d{6}-(\d+)$/);
            if (match) {
                sequenceNumber = parseInt(match[1]) + 1;
            }
        }

        // Generate ID in format: INV-YYYYMM-XXX (e.g., INV-202509-001)
        this.human_readable_invoice_id = `INV-${currentYear}${currentMonth}-${String(sequenceNumber).padStart(3, '0')}`;
    }
    next();
});

export const InvoiceModel = model<IInvoice>('invoices', invoiceSchema);