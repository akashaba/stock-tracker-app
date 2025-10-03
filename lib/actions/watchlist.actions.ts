"use server";


import {connectToDatabase} from "@/database/mongoose";
import Watchlist from "@/database/model/watchlist.model";


/**
 * Return an array of watchlist symbols for the user identified by email.
 * - Graceful: returns [] on any failure or if user not found.
 */
export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];
    try {


        // ensure DB connection (connectToDatabase should be a helper that handles mongoose connection)
        const mongoose = await connectToDatabase()
        const db = mongoose.connection.db;
        if (!db) throw new Error("MongoDB connection error: MongoDB connection error");

        // Find user by email in Better Auth's users collection.
        // Depending on how your Better Auth user model is registered,
        // you may have a User model; fall back to direct collection query.

        const user = await db.collection("user").findOne<{_id?: unknown; id: string; email?: string }>({email});

        if (!user) return [];


        const userId = (user.id as string)|| String(user._id ||'');
        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol:1}).lean()

        return items.map((i) => String(i.symbol));
    } catch (error) {
        console.error('getWatchlistByEmailError', error);
        return [];
    }
}
