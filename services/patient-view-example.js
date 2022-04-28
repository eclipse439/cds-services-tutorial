const express = require("express");
const axios = require("axios");

const router = express.Router();

function isDataAvailable(patient) {
  return (
    patient.name &&
    patient.name[0] &&
    patient.name[0].given &&
    patient.name[0].given[0] &&
    patient.name[0].family &&
    patient.name[0].family[0] &&
    patient.birthDate
  );
}

function isValidPrefetch(request) {
  const data = request.body;
  if (!(data && data.prefetch && data.prefetch.patient)) {
    return false;
  }
  return isDataAvailable(data.prefetch.patient);
}

function retrievePatientResource(fhirServer, patientId, accessToken) {
  const headers = { Accept: "application/json+fhir" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return axios({
    method: "get",
    url: `${fhirServer}/Patient/${patientId}`,
    headers,
  }).then((result) => {
    if (result.data && isDataAvailable(result.data)) {
      return result.data;
    }
    throw new Error();
  });
}

function buildCard(patient) {
  const name = patient.name[0].given[0] + ' ' + patient.name[0].family[0];
  const birthdate = patient.birthDate;
  return {
    cards: [
      {
        summary: `Now seeing: ${name}`,
        detail: 'Birthdate: ' + birthdate,
        source: {
          label: "Patient greeting service",
        },
        indicator: "info",
      },
    ],
  };
}

// CDS Service endpoint
router.post("/", (request, response) => {
  if (!isValidPrefetch(request)) {
    const { fhirServer, fhirAuthorization } = request.body;
    let patient;
    if (request.body.context) {
      patient = request.body.context.patientId;
    }
    if (fhirServer && patient) {
      let accessToken;
      if (fhirAuthorization && fhirAuthorization.access_token) {
        accessToken = fhirAuthorization.access_token;
      }
      retrievePatientResource(fhirServer, patient, accessToken)
        .then((result) => {
          response.json(buildCard(result));
        })
        .catch(() => {
          response.sendStatus(412);
        });
      return;
    }
    response.sendStatus(412);
    return;
  }
  const patientResource = request.body.prefetch.patient;
  const patientViewCard = buildCard(patientResource);
  response.status(200).send(JSON.stringify(patientViewCard, null, 2));
});

module.exports = router;
