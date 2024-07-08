const fs = require("fs");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  // console.log("GET Request in Places");
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    console.log(err);
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
  // Converting mongoose object to default javascript object
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // console.log(userId);
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user",
      500
    );
    console.log(err);
    return next(error);
  }
  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });

  // Alternative: By using populate();
  // let userWithPlaces;
  // try {
  //   userWithPlaces = await User.findById(userId).populate("places");
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not find a user",
  //     500
  //   );
  //   console.log(err);
  //   return next(error);
  // }
  // if (!userWithPlaces || userWithPlaces.places.length === 0) {
  //   return next(
  //     new HttpError("Could not find places for the provided user id.", 404)
  //   );
  // }
  // res.json({
  //   places: userWithPlaces.places.map((place) =>
  //     place.toObject({ getters: true })
  //   ),
  // });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // console.log(errors);
    return next(new HttpError("Invalid inputs, please check your data", 422));
  }
  const { title, description, address } = req.body;
  // Extracting the data from the request (using body-parser)
  // This form of assigning data is called object de-structuring, which is easier when compared to
  // const title = req.body.title ....

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
    // console.log(coordinates);
  } catch (err) {
    const error = new HttpError("Invalid address, please check your data", 404);
    // console.log(error);
    return next(error);
  }

  // console.log(coordinates);
  const createdPlace = new Place({
    title, // similar to title: title
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });
  // Checking if there exists a user with id: "creator"
  // Place will be created only if the user exists
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, creating place failed, please try again",
      500
    );
    console.log(err);
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  /* Transaction:
  1) Create new place document in database
  2) Add new place's id to the corresponding user document in db
  */
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, creating place failed, please try again",
      500
    );
    console.log(err);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // console.log(errors);
    return next(new HttpError("Invalid inputs, please check your data", 422));
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;
  // const place = DUMMY_PLACES.find((p) => {
  //   return p.id === placeId;
  // });
  // Shortest way for the same.
  // const place = { ...DUMMY_PLACES.find((p) => p.id === placeId) };
  // const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId);

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    console.log(err);
    return next(error);
  }

  // Adding backend authorization
  if (place.creator.toString() !== req.userData.userId) {
    // place.creator holds the userId in mongoose ObjectId format, for comparison we are
    // converting it into string format
    const error = new HttpError("You are not allowed to edit this place!", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    console.log(err);
    return next(error);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  // if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //   throw new HttpError("Could not find a place with that id.", 404);
  // }
  // DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId);
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
    // populate() allows us to refer to a document stored in another collection and to work
    // with data in that existing document. For this there should be a relation between these
    // two documents, that's why we've used 'ref' property in place.js and user.js.
    // populate() also needs the information about the document where we want to change something
    // Here we are specifying 'creator' property, because it contains the userId, mongoose
    // takes this id and searches the entire user data. So the id allows us to search for the
    // user and to get back all the data stored in a user document.
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete the place.",
      500
    );
    console.log(err);
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this id", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place!",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    // We have access to all the information about the user who created this place since we've
    // used populate('creator'), so we can update(i.e., pull() and save()) the information of
    // that particular user who created this place.
    sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete the place.",
      500
    );
    console.log(err);
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place Deleted!" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
