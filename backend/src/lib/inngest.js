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

        const primaryEmail = email_addresses?.[0]?.email_address;

        // FIX 1: Assign step.run output to 'newUser' variable
        const newUser = await step.run("save-user-to-db", async () => {
            await connectDB();

            return await User.create({
                clerkId: id,
                email: primaryEmail,
                name: `${first_name || ""} ${last_name || ""}`.trim(),
                profileImage: image_url,
            });
        });

        // FIX 2: Wrap Stream API call in a step
        await step.run("sync-user-to-stream", async () => {
            await upsertStreamUser({
                id: newUser.clerkId.toString(),
                name: newUser.name,
                image: newUser.profileImage,
            });
        });

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

        // FIX 3: Added () to id.toString() and wrapped in step.run
        await step.run("delete-user-from-stream", async () => {
            await deleteStreamUser(id.toString());
        });

        return { success: true };
    }
);

export const functions = [syncUser, deleteUserFromDB];