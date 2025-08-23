import { Types } from "mongoose";

export interface TechnicianToServiceDocument extends Document {
    technicianId: Types.ObjectId;
    human_redable_id:string
    parent_serviceId: Types.ObjectId;
    sub_serviceId: Types.ObjectId[];
    status: boolean;

}

