const express = require("express");
const { check } = require("express-validator");

const placeControllers = require("../controllers/places-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:pid", placeControllers.getPlaceById);

router.get("/user/:uid", placeControllers.getPlacesByUserId);
// * Ordering of requests is IMPORTANT
// Example: If there is any request made to "/user" or any as such, user is static to itself,
// but it is treated as a dynamic value for pid in the request "/:pid" and gives empty json
// response "{}" instead of the response which the request "/user" would give. In such cases,
// "/user" request should be placed above "/:pid" request.

// Token validating middleware:
// Since the above routes doesn't involve token validation, this middleware is placed here.
router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placeControllers.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placeControllers.updatePlace
);

router.delete("/:pid", placeControllers.deletePlace);

module.exports = router;
