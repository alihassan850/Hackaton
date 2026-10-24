import User from "../models/user.model.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";

//GET CURRENT-USER CONTROLLER
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new apiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        )
    );
});

//UPDATE-PROFILE CONTROLLER
// UPDATE PROFILE
// UPDATE PROFILE
const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, username } = req.body;

    const updates = {};

    // Validate and prepare fullName if provided
    if (fullName !== undefined) {
        if (
            typeof fullName !== "string" ||
            !fullName.trim()
        ) {
            throw new apiError(400, "Full name cannot be empty");
        }

        updates.fullName = fullName.trim();
    }

    // Validate and prepare username if provided
    if (username !== undefined) {
        if (
            typeof username !== "string" ||
            !username.trim()
        ) {
            throw new apiError(400, "Username cannot be empty");
        }

        updates.username = username.trim().toLowerCase();
    }

    // Require at least one field to update
    if (Object.keys(updates).length === 0) {
        throw new apiError(
            400,
            "Please provide a full name or username to update"
        );
    }

    // Check if the username belongs to another user
    if (updates.username) {
        const existingUser = await User.findOne({
            username: updates.username,
            _id: { $ne: req.user._id },
        });

        if (existingUser) {
            throw new apiError(
                409,
                "Username is already taken"
            );
        }
    }

    // Find the authenticated user
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new apiError(404, "User not found");
    }

    // Apply the changes
    Object.assign(user, updates);

    await user.save();

    // Exclude sensitive fields from the response
    const updatedUser = await User.findById(user._id).select(
        "-password -refreshToken -resetPasswordToken -resetPasswordExpires"
    );

    return res.status(200).json(
        new apiResponse(
            200,
            updatedUser,
            "Profile updated successfully"
        )
    );
});

//CHANGE-PASSWORD CONTROLLER
const changePassword = asyncHandler( async()=> {

})

//UPDATE ACCOUNT-DETAILS CONTROLLER
const updateAccountDetails = asyncHandler( async()=> {

})

export {getCurrentUser, updateProfile, changePassword, updateAccountDetails}