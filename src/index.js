import dotenv from "dotenv";
import app from "./app.js";
import connectDb from "./db/index.js";

//configuration of dotenv
dotenv.config({
  path: "./.env",
});

//port number  from   dotenv
const port = process.env.PORT || 8000;

//connect to data base
connectDb().then(() => {
  app.on("error", () => {
    console.log("Error : while connecting to Express !");
    process.exit(1);
  });
  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
});
