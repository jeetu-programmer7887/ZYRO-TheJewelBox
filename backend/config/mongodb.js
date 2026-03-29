import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on("connected", () => {
        console.log("DB connected Successfully... :)");
    })

    mongoose.connection.on("error", (error) => {
        console.log("DB connection Error : ", error);
    })

    await mongoose.connect(`${process.env.MONGODB_URI}/zyroDB`);
}

export default connectDB;