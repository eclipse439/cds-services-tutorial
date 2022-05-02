const express = require("express");
// const services = require("patient_card_cds");
const bodyParser = require("body-parser");
const cdsServices = require("./discovery/cds-services");
const defaultCors = require("./middleware/default-cors");
const errorHandler = require("./middleware/error-handler");

// const tracer = require("./middleware/tracer")('https-example');

const app = express();

// app.use(countAllRequests());

// This is necessary middleware to parse JSON into the incoming request body for POST requests
app.use(bodyParser.json());

// CDS Services must implement CORS to be called from a web browser
app.use(defaultCors);

app.set("json spaces", "  ");

app.use("/cds-services", cdsServices);
// app.use(services);


app.use((request, response, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});


// Handle specified errors or return a 500 for internal errors
app.use(errorHandler);

app.listen(3000);

module.exports = app;
