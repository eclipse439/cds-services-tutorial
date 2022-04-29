const express = require("express");
const router = express.Router();
const serviceDefinitions = require("./service-definitions");
// const patientViewExample = require("patient_card_cds");
// const patientHypertensionWarning = require("../services/patient-hypertension-warning");
// const patientVaccineReminder = require("../services/patient-vaccine-reminder");

// Discovery Endpoint
router.get("/", (request, response) => {
  const discoveryEndpointServices = {
    services: serviceDefinitions,
  };
  response.json(discoveryEndpointServices);
});

// Routes to patient-greeting CDS Service
// router.use("/patient-view-example", patientViewExample);
// router.use("/patient-hypertension-warning", patientHypertensionWarning);
// router.use("/patient-vaccine-reminder", patientVaccineReminder);

module.exports = router;