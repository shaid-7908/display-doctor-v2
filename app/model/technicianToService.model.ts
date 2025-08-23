import mongoose, { Schema,model } from "mongoose";
import { TechnicianToServiceDocument } from "../types/technicianToService.types";

interface ITechnicianToService extends mongoose.Model<TechnicianToServiceDocument>{
    generateTechnicianUniqueCode():Promise<string>
}
const technicianToServiceSchema = new Schema<TechnicianToServiceDocument,ITechnicianToService>({
    technicianId:{
        type:Schema.Types.ObjectId,
        ref:"users",
        required:true,
    },
    parent_serviceId:{
        type:Schema.Types.ObjectId,
        ref:"servicecategories",
        required:true,
    },
    sub_serviceId:{
        type:[Schema.Types.ObjectId],
        ref:"servicesubcategories",
        required:true,
    },
    human_redable_id:{
        type:String,
        required:true,
    },
    status:{
        type:Boolean,
        default:true,
    }
    
})

export async function generateTechnicianUniqueCode(): Promise<string> {
    try {
        const prefix = "TECHNI";
        const year = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year

        // Get the latest issue code for this year
        const latestTechnician  = await TechnicianToServiceModel.findOne({
            human_redable_id: { $regex: `^${prefix}${year}` },
        }).sort({ human_redable_id: -1 });

        let sequence = 1;
        if (latestTechnician) {
            // Extract sequence number from the latest code (e.g., ISSUE24000001 -> 1)
            const lastSequence = parseInt(latestTechnician.human_redable_id.slice(-5));
            sequence = lastSequence + 1;
        }

        // Format: ISSUE + YY + 5-digit sequence (e.g., ISSUE24000001, ISSUE24000002, etc.)
        const generatedCode = `${prefix}${year}${sequence
            .toString()
            .padStart(5, "0")}`;
        console.log("Generated issue code:", generatedCode);
        return generatedCode;
    } catch (error) {
        console.error("Error generating issue code:", error);
        throw error;
    }
}

technicianToServiceSchema.statics.generateTechnicianUniqueCode = generateTechnicianUniqueCode;
const TechnicianToServiceModel = model<TechnicianToServiceDocument,ITechnicianToService>("technician_to_service_relations",technicianToServiceSchema)

export default TechnicianToServiceModel;