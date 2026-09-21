import { StreamChat } from "stream-chat";
import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("STREAM_API_KEY or STREAM_API_SECRET is missing");
}


export const chatClient = StreamChat.getInstance(apiKey, apiSecret);//will be used for chat features

export const streamClient = new StreamClient(apiKey,apiSecret);//used for video calls


export const upsertStreamUser = async (userData) => {
    try {
        await chatClient.upsertUser(userData);
        console.log("Stream user upserted successfully:", userData.id);
    } catch (error) {
        console.error("Error upserting Stream user:", error);
        throw error; // Re-throw so Inngest detects failure and retries
    }
};

export const deleteStreamUser = async (userId) => {
    try {
        // FIX: Use deleteUser (singular) for individual user deletion
        await chatClient.deleteUser(userId, { mark_messages_deleted: true });
        console.log("Stream user deleted successfully:", userId);
    } catch (error) {
        console.error("Error deleting the Stream user:", error);
        throw error; // Re-throw so Inngest detects failure and retries
    }
};


