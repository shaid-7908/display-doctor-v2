import { Document,Types,Schema, model } from "mongoose";


export interface IIssueReport extends Document{
    issue_id:Types.ObjectId,
    serviceCategoryId:Types.ObjectId,
    deviceType:String,
    deviceModelNumber:String,
    deviceName:String,
    techNote:String,
    requiredParts:String,
    budgetEstimation:Number,
    initialQuotation:Number,
    finalQuotation:Number,
    is_approved:Boolean,
    technicianId:Types.ObjectId,
    quotation_type:String
    issue_human_redable_id:String,
    status:String
}

const IssueSchema = new Schema<IIssueReport>({
  issue_id:{
    type:Schema.Types.ObjectId,
    ref:'issues'
  },

  serviceCategoryId: {
    type: Schema.Types.ObjectId,
    ref: "serviceCategories",
  },
  deviceType:{
    type:String,
    default:'tv'
  },
  deviceModelNumber:{
    type:String
  },
  deviceName:{
    type:String
  },
  techNote:{
    type:String
  },
  requiredParts:{
    type:String
  },
  budgetEstimation:{
    type:Number
  },

  initialQuotation:{
    type:Number,
    default:0
  },

  finalQuotation:{
    type:Number,
    default:0
  },
  is_approved:{
   type:Boolean,
   default:false
  },
  technicianId:{
    type:Schema.Types.ObjectId,
    ref:'users'
  },
  quotation_type:{
    type:String,
    enum:['none','initial','final'],
    default:['none']
  },
  issue_human_redable_id:{
    type:String
  },
  status:{
    type:String,
    enum:["open","closed","bill-generated"],
    default:"open"
  }

},{timestamps:true});

export const IssueReportModel = model<IIssueReport>('issue_reports',IssueSchema)