import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { errorHandler } from './app/middelware/errorhandler.middleware'
import envConfig from './app/config/env.config'
import { connectDB } from './app/config/db.connection'
import basicRouter from './app/routes/basic.route'

const app = express()


//a basic setup that should be done almost always

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))


//if using multer to store files locally uncomment this 

//app.use(express.static(path.join(__dirname, "uploads")));

//if using ejs as template engine uncomment this , and make sure you have "views" , "public" folder on the root where server.ts is

//app.set("view engine", "ejs");
//app.set("views", path.join(__dirname, "views"));


//Define your routes here , 

app.use('/any-prefix',basicRouter)





//this is the global erro handler middleware , it should always be at the buttom of all rotes
app.use(errorHandler) 

//Statrt the server
const startServer = async () => {
  try {
    await connectDB(); // Connect to MongoDB
    app.listen(envConfig.PORT, () => {
      console.log(`✅ Server running on http://localhost:${envConfig.PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to DB. Server not started.", err);
    process.exit(1); // Exit if DB fails
  }
};

startServer();
