    import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js";
import crypto from "node:crypto";
import { sendEmail } from "../utils/sendEmail.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new apiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
    console.error("Original token generation error:", error);

    if (error instanceof apiError) {
        throw error;
    }

    throw new apiError(
        500,
        "Something went wrong while generating access and refresh tokens"
    );
}
};

//SIGNUP-CONTROLLER
const registerUser = asyncHandler( async (req, res) => {
    //step 1: get user details from frontend
    const { fullName, username, email, password } = req.body;

    //step 2: validation -not empty
    if(
        [fullName, username, email, password].some(
            (field) => !field || field.trim() === "")
    ) {
        throw new apiError(400, "All fields are required");
    }

    //step 3: Check if user exists
    const existUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existUser){
        throw new apiError(408, "User with email or username already exists!")
    }

    //step 4: create user object in DB
    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase()
    })

    //step 4: Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new apiError(500, "something is wrong while registering the User")
    }

    //step 5: Return response to frontend 
    return res.status(201).json(
        new apiResponse(200, createdUser, "User register Successfully !!")
    )

    //step 6: Send Welcome Email 

    console.log("3. About to send welcome email");
    console.log("sendEmail type:", typeof sendEmail);

    try {
        console.log("4. Calling sendEmail now");

        await sendEmail({
            email: createdUser.email,
            subject: "Welcome to Our Website!",
            message: `Hi ${createdUser.username},

Welcome to Our Website!

Your account has been created successfully.
We're excited to have you join us!

Best regards,
The Our Website Team`,
        });

        console.log("5. Welcome email sent successfully!");
    } catch (error) {
        console.error("Welcome email failed:", error);
    }

    // Step 6: Return response to frontend
    return res.status(201).json(
        new apiResponse(
            201,
            createdUser,
            "User registered successfully!"
        )
    );
});

//LOGIN-CONTROLLLER
const loginUser = asyncHandler(async (req, res) => {

    //step 1: Get data from req.body
const { username, email, password } = req.body;

//step 2: Check the username or email
if (!password || (!username && !email)) {
    throw new apiError(
        400,
        "Username or email, and password are required"
    );
}

//step 3: Find the user in DB
const user = await User.findOne({
    $or: [{username}, {email}]
})

if(!user){
    throw new apiError(404, "User does not exist!")
}

//step 4: Check the password if the user exist
if(user){
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(404, "invalid credentials")
    }
}

//step 5: Get Access and Refresh Tokens
const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

const loggedIn = await User.findById(user._id).
select("-password -refreshToken")

//step 6: Send Cookie and response to frontend 

//Same site, such as app.example.com and api.example.com: SameSite: "lax" can work.
//Different sites, such as a Vercel frontend and a Render backend on their default domains: 
// you will generally need sameSite: "none" and secure: true, along with credentialed CORS.
const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
    new apiResponse(
        200,
        {
            user: loggedIn, accessToken, refreshToken
        },
            "User loggedIn Successfully !!"
    )
)
})

//LOGINOUT-CONTROLLER 
const logoutUser = asyncHandler(async (req, res) => {
     await User.findByIdAndUpdate(
             req.user._id,
            {
                 $set: { 
                    refreshToken: undefined 
                }
            },
            {
                    new: true
            } 
        )
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out successfully"))
    
})

//FORGET-PASSWORD-CONTROLLER
const forgetPassword = asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();

    if(!email) {
        return res.status(400).json({
            message:"Email is required"
        });
    }

    const successMessage =
    "If this email is registered, a reset link will be sent."

    const user = await User.findOne({email});

    //Do not reveal whether an account exists
    if(!user) {
        return res.status(200).json({
            message: successMessage
        });
    }

    //Generate a cryptograpically secure token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    //Store only its hash in MongoDB.
    const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

    user.resetPasswordToken = hashedToken;

    //Token expires after 15 minutes
    user.resetPasswordExpires = new Date(
        Date.now() + 15 * 60 * 1000
    );

    await user.save({validateBeforeSave: false});

    const resetURL = 
        `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

     const message =
        `Click this link to reset your password:\n\n${resetURL}\n\n` +
        "This link expires in 15 minutes.";

    try {
        await sendEmail({
            email: user.email,
            subject: "Password Reset Request",
            message
        });
    } catch (error) {
        // Invalidate token if email delivery fails.
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save({ validateBeforeSave: false });

        console.error("Password reset email failed:", error);

        return res.status(500).json({
            message: "Unable to send reset email. Try again later."
        });
    }

    return res.status(200).json({
        message: successMessage
    });
    
})

//RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {

    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (
        typeof password !== "string" ||
        typeof confirmPassword !== "string" ||
        password.length < 8 ||
        password !== confirmPassword
    ) {
        return res.status(400).json({
            message: "Invalid password or passwords do not match"
        });
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // Find user with a valid, unexpired token.
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
        return res.status(400).json({
            message: "Invalid or expired reset token"
        });
    }

    // Your existing pre-save hook should hash this password.
    user.password = password;

    // Invalidate reset token.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Invalidate existing refresh token if stored in the model.
    user.refreshToken = undefined;

    await user.save();

    return res.status(200).json({
        message: "Password reset successfully"
    });
});

//REFRESH-ACCESS-TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
        throw new apiError(401, "Refresh token is required");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch (error) {
        throw new apiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (
        !user ||
        user.refreshToken !== incomingRefreshToken
    ) {
        throw new apiError(401, "Refresh token is invalid");
    }

    // Generate new access and refresh tokens.
    // Your helper also saves the new refresh token in MongoDB.
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {},
                "Access token refreshed successfully"
            )
        );
});

export { registerUser, loginUser, logoutUser, forgetPassword, resetPassword, refreshAccessToken }