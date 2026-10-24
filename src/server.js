import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;


//We want the database connection to succeed before Express starts accepting requests. 
//If MongoDB fails to connect, our connection function exits the process instead.
const startServer = async () => {
    await connectDB();
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

startServer();