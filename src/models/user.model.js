import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//DATA MODEL FOR USER

//Mongoose Schema defines the structure and validation rules for your data.
const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
    },

    refreshToken: {
      type: String,    
    },

    resetPasswordToken: {
      type: String
    },

    resetPasswordExpires: {
      type: Date
    }

  },
  { 
    timestamps: true 
   }   
);

//HASHING PASSWORDS

//hashing the password before saving it to the database. This is a security measure to protect user passwords in case of a data breach.
userSchema.pre("save", async function () {
    // Only hash when the password is new or changed
    if(!this.isModified("password")) return

    this.password = await bcrypt.hash(this.password, 10);
});

//Checking if the provided password matches the hashed password stored in the database. This is used during user login to verify credentials.
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

//JWT TOKEN GENERATION

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
        }
    );
};

const User = mongoose.model("User", userSchema);

export default User;