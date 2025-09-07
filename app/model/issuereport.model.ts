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
  }
});

const IssuModel = model<IIssueReport>('issue_reports',IssueSchema)