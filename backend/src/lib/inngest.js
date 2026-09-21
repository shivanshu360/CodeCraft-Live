import { Inngest } from "inngest";
import { connectDB } from './db.js';
import User from "../models/User.js";
import { deleteStreamUser, upsertStreamUser } from "./stream.js";

export const inngest = new Inngest({ id: "CodeCraft-Live" });

const syncUser = inngest.createFunction(
    { id: "sync-user" },
    { event: "clerk/user.created" },
    async ({ event, step }) => {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;

        // FIX: Changed email_addresses to email_address (singular)
        const primaryEmail = email_addresses?.[0]?.email_address;

        // Wrap DB operations inside step.run for proper step tracking
        await step.run("save-user-to-db", async () => {
            await connectDB();

            return await User.create({
                clerkId: id,
                email: primaryEmail,
                name: `${first_name || ""} ${last_name || ""}`.trim(),
                profileImage: image_url,
            });
        });

        await upsertStreamUser({
            id: newUser.clerkId.toString(),
            name: newUser.name,
            image: newUser.profileImage
        })

        return { success: true };
    }
);

const deleteUserFromDB = inngest.createFunction(
    { id: "delete-user-from-db" },
    { event: "clerk/user.deleted" },
    async ({ event, step }) => {
        const { id } = event.data;

        await step.run("delete-user-from-db", async () => {
            await connectDB();
            return await User.deleteOne({ clerkId: id });
        });

        await deleteStreamUser(id.toString)

        return { success: true };
    }
);

export const functions = [syncUser, deleteUserFromDB];