const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));
// Returns the files requested which are located in path '/uploads/images'

// CORS(Cross-Origin Resource Sharing) error occurs when request sender and receiver domains
// are different, which is what exactly happens in our case. To handle this error, we are
// using following middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Here * is used to denote every other domain can have access to this backend domain(localhost:4000)
  // Also we can restrict the access to 'localhost:3000' which is our frontend domain.

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Accept, Content-Type, Authorization"
  );
  // This controls which headers the incoming request may have so that they are handled.
  // We can set this to * as well, but to be a bit specific we're allowing only a certain headers.
  // Content-Type and Authorization are the headers we set explicitly on the frontend, and the
  // remaining are set by the browser automatically,

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  // This controls which methods the incoming request may have or which HTTP methods may be
  // used on the frontend so that they are handled.

  next();
});

app.use("/api/users", usersRoutes);

app.use("/api/places", placesRoutes); // This middleware doesn't call next, if we do send a
// response, we don't call next, and hence no other middlewares after this one will be reached

// So the below middleware is only reached if we didn't get a response from any of the requests above.
// That can only be a request we don't want to handle.
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured!" });

  // This middleware has 4 parameters instead of 3, so express recognises it as a special
  // middleware, which is a "error middleware".
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hsprdop.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("MongoDB connected!");
    app.listen(process.env.PORT || 4000);
  })
  .catch((error) => {
    console.log("MongoDB connection failed!");
    console.log(process.env.DB_USER);
    console.log(process.env.DB_PASSWORD);
    console.log(process.env.DB_NAME);
    console.log(error);
  });

//   "MAP_API_KEY": "pk.dbd308c38bf99f9b4b54331f2ec2ebc7",
// "JWT_KEY": "supersecret_dont_share"
