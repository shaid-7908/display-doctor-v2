import { Schema, model } from "mongoose";
import { AddressProofDocument } from "../types/addressproof.types";


const addressProofSchema = new Schema<AddressProofDocument>({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"users",
        required:true,
    },
    pin_code:{
        type:Number,
    },
    city:{
        type:String,
    },
    state:{
        type:String,
    },
    address_line_1:{
        type:String,
    },
    adhar_number:{
        type:String,
    },
    adhar_front_image:{
        type:String,
    },
    son_or_daughter_of:{
        type:String,
    },
    phone_number:{
        type:String,
    },
    alternate_phone_number:{
        type:String,
    },
})

const AddressProofModel = model<AddressProofDocument>("address_proofs",addressProofSchema)
export default AddressProofModel;