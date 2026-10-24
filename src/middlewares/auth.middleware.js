
import { asyncHandler } from "../utils/ayncHandler.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
        throw new apiError(401, "Access token is required");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );
    } catch (error) {
        throw new apiError(401, "Invalid or expired access token");
    }

    const user = await User.findById(decodedToken._id)
        .select("-password -refreshToken");

    if (!user) {
        throw new apiError(401, "User not found for this token");
    }

    req.user = user;

    next();
});
