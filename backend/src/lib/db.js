import mongoose from "mongoose"
import dns from "dns"
import { ENV } from "./env.js"

dns.setServers(['8.8.8.8', '8.8.4.4'])

export const connectDB = async() => {
    try{
        const conn = await mongoose.connect(ENV.MONGO_URI)
        console.log("Connected to MongoDb:",conn.connection.host)
    }catch(error){
        console.log("Error connectig to MongoDB",error);
        process.exit(1);//0 means success , 1 means failure
    }
}