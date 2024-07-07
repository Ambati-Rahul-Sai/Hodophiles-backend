const express = require("express");
const { check } = require("express-validator");

const userControllers = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", userControllers.getAllUsers);

router.post("/login", userControllers.userLogin);

router.post(
  "/signup",
  fileUpload.single("image"), // This instructs multer to extract that image/file on the image
  // key on the incoming request.
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userControllers.userSignUp
);

module.exports = router;
