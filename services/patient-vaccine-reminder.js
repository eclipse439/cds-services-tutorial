const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

function isDataAvailable(immunizations) {
  return (
    immunizations.total
  );
}

function isValidPrefetch(request) {
  const data = request.body;
  if (!(data && data.prefetch && data.prefetch.immunizations)) {
    return false;
  }
  return isDataAvailable(data.prefetch.immunizations);
}

function retrieveImmunizationResource(fhirServer, patientId, accessToken) {
  const headers = { Accept: "application/json+fhir" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return axios({
    method: "get",
    url: `${fhirServer}/Immunization?patient=${patientId}&status=completed&vaccine-code:text=flu,influenza&_sort=-date`,
    headers,
  }).then((result) => {
    if (result.data && isDataAvailable(result.data)) {
      return result.data;
    }
    throw new Error();
  });
}

function buildCard(immunizations) {
    const fluVaccineOnFile = immunizations.total;

  // Check if any flu vaccines are on file
  if (fluVaccineOnFile) {
    // Return this card if the patient already has a flu vaccine < 9 months
    return {
      cards: [
        {
          summary: 'Flu vaccine up to date!',
          detail: 'Last vaccine was on ' + immunizations.occurenceDateTime + '.',
          indicator: 'info',
          source: {
            label: 'CDS Service Tutorial'
          }
        }
      ]
    };
  } else { // No vaccine on file
    return {
      cards: [
        {
          // Vaccine popup for flu vaccine
          summary: 'Flu vaccine recommended!',
          indicator: 'warning',
          detail: 'This patient currently has no flu vaccine on file.',
          source: {
            label: 'CDS Service Tutorial'
          },
          links: [
            {
              label: 'Flu Vaccine Key Facts',
              url: 'https://www.cdc.gov/flu/prevent/keyfacts.htm',
              type: 'absolute'
            }
          ]
        }
      ]
    };
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
      retrieveImmunizationResource(fhirServer, patient, accessToken)
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
  const resource = request.body.prefetch.patient;
  response.json(buildCard(resource));
});

module.exports = router;
