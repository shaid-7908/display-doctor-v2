import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { errorHandler } from "./app/middelware/errorhandler.middleware";
import envConfig from "./app/config/env.config";
import { connectDB } from "./app/config/db.connection";
import basicRouter from "./app/routes/basic.route";
import session from "express-session";
import flash from "connect-flash";
import bodyParser from "body-parser";
import authRouter from "./app/routes/auth.route";
import adminRouter from "./app/routes/admin.routes";
import commonRouter from "./app/routes/common.routes";
const app = express();
import moment from "moment";
import technicianRouter from "./app/routes/technician.routes";
//a basic setup that should be done almost always

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.delete_msg = req.flash("delete_msg");
  next();
});
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 2000,
  })
);

//if using multer to store files locally uncomment this

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//if using ejs as template engine uncomment this , and make sure you have "views" , "public" folder on the root where server.ts is

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//Define your routes here ,

app.use(authRouter);
app.use("/any-prefix", basicRouter);
app.use(adminRouter);
app.use(commonRouter);
app.use(technicianRouter)

//this is the global erro handler middleware , it should always be at the buttom of all rotes
app.use(errorHandler);

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
