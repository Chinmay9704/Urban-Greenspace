const { Loader } = require('@googlemaps/js-api-loader');

const loader = new Loader({
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    version: "beta",
    libraries: ["places", "marker"]
});

module.exports = loader; 