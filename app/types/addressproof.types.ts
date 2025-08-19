import { Document ,Types} from "mongoose";

export interface AddressProofDocument extends Document{
    userId:Types.ObjectId;
    pin_code:Number;
    city:String;
    state:String;
    address_line_1:String;
    adhar_number:String;
    adhar_front_image:String;
    son_or_daughter_of:String;
    phone_number:String;
    alternate_phone_number:String;
}