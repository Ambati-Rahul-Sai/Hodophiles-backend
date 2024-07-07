// There two different api listed below which are of trial/free versions.
// They have limited number of requests per day. If you aren't getting coordinates, you might
// have exceeded the daily limit of requests for that respective api, then you can use the other api.
// Both are working perfectly

const axios = require("axios");
const HttpError = require("../models/http-error");

const API_KEY = process.env.MAP_API_KEY;

// Alternative:

// const getCoordsForAddress = async (address) => {
//   const response = await axios.get(
//     `https://nominatim.openstreetmap.org/?addressdetails=1&q=${encodeURIComponent(
//       address
//     )}&format=json&limit=1`
//   );
//   const data = response.data;

//   if (!data) {
//     const error = new HttpError(
//       "Could not find location for this address",
//       422
//     );
//     throw error;
//   }

//   const coordinates = {
//     lat: data[0].lat,
//     lng: data[0].lon,
//   };
//   // console.log(coordinates);
//   return coordinates;
// };

// module.exports = getCoordsForAddress;

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(
      address
    )}&format=json`
  );
  const data = response.data[0];
  if (!data || data.status === "ZERO_RESULTS") {
    const error = new HttpError(
      "Could not find location for the specified address.",
      422
    );
    throw error;
  }
  const coorLat = data.lat;
  const coorLon = data.lon;
  const coordinates = {
    lat: coorLat,
    lng: coorLon,
  };

  return coordinates;
}

module.exports = getCoordsForAddress;
