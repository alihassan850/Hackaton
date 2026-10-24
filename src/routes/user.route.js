import { Router } from "express";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    forgetPassword,
    resetPassword,
} from "../controllers/auth.controller.js";

import {
    getCurrentUser,
    updateProfile,
    changePassword,
    updateAccountDetails,
} from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

// Public authentication routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgetPassword);
userRouter.post("/reset-password/:token", resetPassword);
userRouter.post("/refresh-token", refreshAccessToken);

// Protected routes
userRouter.post("/logout", verifyJWT, logoutUser);
userRouter.get("/current-user", verifyJWT, getCurrentUser);
userRouter.patch("/update-profile", verifyJWT, updateProfile);
userRouter.patch("/change-password", verifyJWT, changePassword);
userRouter.patch("/update-account", verifyJWT, updateAccountDetails);

export { userRouter };