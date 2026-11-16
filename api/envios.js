import mongoose from "mongoose";
import Envio from "./models/envio.js";

export default async function handler(req,res) {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

    }
    catch (error) {

    }
    
}