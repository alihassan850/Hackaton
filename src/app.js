import express from "express";
import cors from "cors";  //helps allow requests from a different origin, such as your Next.js frontend.
import User from "./models/user.model.js";;
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));   

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        success: true,
        message: "API is healthy"
     });
});

//routes import
import { userRouter } from "./routes/user.route.js"

//routes declaration
app.use("/api/v1/users", userRouter);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
});

export default app;