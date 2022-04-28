const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// This is necessary middleware to parse JSON into the incoming request body for POST requests
app.use(bodyParser.json());

/**
 * Security Considerations:
 * - CDS Services must implement CORS in order to be called from a web browser
 */
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', 'https://sandbox.cds-hooks.org');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Expose-Headers', 'Origin, Accept, Content-Location, ' +
    'Location, X-Requested-With');

  // Pass to next layer of middleware
  next();
});

/**
 * Authorization.
 * - CDS Services should only allow calls from trusted CDS Clients
 */
app.use((request, response, next) => {
  // Always allow OPTIONS requests as part of CORS pre-flight support.
  if (request.method === 'OPTIONS') {
    next();
    return;
  }

  const serviceHost = request.get('Host');
  const authorizationHeader = request.get('Authorization') || 'Bearer open'; // Default a token until ready to enable auth.

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer')) {
    response.set('WWW-Authenticate', `Bearer realm="${serviceHost}", error="invalid_token", error_description="No Bearer token provided."`)
    return response.status(401).end();
  }

  const token = authorizationHeader.replace('Bearer ', '');
  const aud = `${request.protocol}://${serviceHost}${request.originalUrl}`;

  const isValid = true; // Verify token validity per https://cds-hooks.org/specification/current/#trusting-cds-clients

  if (!isValid) {
    response.set('WWW-Authenticate', `Bearer realm="${serviceHost}", error="invalid_token", error_description="The token is invalid."`)
    return response.status(401).end();
  }

  // Pass to next layer of middleware
  next();
})

/**
 * Discovery Endpoint:
 * - A GET request to the discovery endpoint, or URL path ending in '/cds-services'
 * - This function should respond with definitions of each CDS Service for this app in JSON format
 * - See details here: https://cds-hooks.org/specification/current/#discovery
 */
app.get('/cds-services', (request, response) => {

  // Example service to invoke the patient-view hook
  const patientViewExample = {
    hook: 'patient-view',
    id: 'patient-view-example',
    title: 'Example patient-view CDS Service',
    description: 'Displays the name of the patient',
    prefetch: {
      // Request the Patient FHIR resource for the patient in context, where the EHR fills out the prefetch template
      // See details here: https://cds-hooks.org/specification/current/#prefetch-template
      requestedPatient: 'Patient/{{context.patientId}}'
    }
  };

  // Hypertension Warning Card
  const patientHypertensionWarning = {
    hook: 'patient-view',
    id: 'patient-hypertension-warning',
    title: 'Patient Hypertension Warning Service',
    description: 'Displays alert if patient has hypertension condition',
    prefetch: {
      patientHypertensionCondition: 'Condition?patient={{context.patientId}}&code=http://snomed.info/sct|1201005'
    }
  }

  // Flu Vaccine service invoking patient-view hook
  const fluVaccineReminder = {
    hook: 'patient-view',
    id: 'patient-vaccine-reminder',
    title: 'Example flu-vaccine CDS Service',
    description: 'Suggests clinician to recommend flu vaccine',
    prefetch: {
      // Request the Patient FHIR resource for the patient in context, where the EHR fills out the prefetch template
      // See details here: https://cds-hooks.org/specification/current/#prefetch-template
      lastFluVaccine: 'Immunization?patient={{context.patientId}}&status=completed&vaccine-code:text=flu,influenza&_sort=-date'
    }
  };

  const discoveryEndpointServices = {
    services: [patientViewExample, patientHypertensionWarning, fluVaccineReminder]
  };
  response.send(JSON.stringify(discoveryEndpointServices, null, 2));
});

/**
 * Hypertension Warning Service:
 * - Handles POST requests to our patient-hypertension-warning endpoint
 * - This function should respond with an array of card(s) in JSON format for the patient-view hook
 *
 * - Service purpose: Display whether a patient has hypertension or not
 */
 app.post('/cds-services/patient-hypertension-warning', (request, response) => {

  // Parse the request body for the Patient prefetch resource
  const hypertensionQuery = request.body.prefetch.patientHypertensionCondition;
  if(hypertensionQuery.total) {
    // create and return hypertension warning
    const hypertensionCard = {
      cards: [
        {
          // Use the patient's First and Last name
          summary: 'Hypertension Warning',
          detail: '*This patient has hypertension.* <br />**Onset:** ' + hypertensionQuery.entry[0].resource.onsetDateTime + ", **Last Updated:** " + hypertensionQuery.entry[0].resource.meta.lastUpdated,
          indicator: 'warning',
          source: {
            label: 'CDS Service Tutorial',
            url: 'https://github.com/cerner/cds-services-tutorial/wiki/Patient-View-Service'
          },
          links: [
            {
              label: 'Hypertension Key Facts',
              url: 'https://www.cdc.gov/bloodpressure/facts.htm',
              type: 'absolute'
            }
          ]
        }
      ]
    };
    response.send(JSON.stringify(hypertensionCard, null, 2));
  }
  response.status(200);
});

/**
 * Example Patient View Service:
 * - Handles POST requests to our patient-view-example endpoint
 * - This function should respond with an array of card(s) in JSON format for the patient-view hook
 *
 * - Service purpose: Display a patient's first and last name, with a link to the CDS Hooks web page
 */
 app.post('/cds-services/patient-view-example', (request, response) => {

  // Parse the request body for the Patient prefetch resource
  const patientResource = request.body.prefetch.requestedPatient;
  const patientViewCard = {
    cards: [
      {
        // Use the patient's First and Last name
        summary: 'Now seeing: ' + patientResource.name[0].given[0] + ' ' + patientResource.name[0].family[0],
        detail: 'Birthdate: ' + patientResource.birthDate,
        indicator: 'info',
        source: {
          label: 'CDS Service Tutorial',
          url: 'https://github.com/cerner/cds-services-tutorial/wiki/Patient-View-Service'
        },
        links: [
          {
            label: 'Learn more about CDS Hooks',
            url: 'https://cds-hooks.org',
            type: 'absolute'
          }
        ]
      }
    ]
  };
  response.send(JSON.stringify(patientViewCard, null, 2));
});

/**
 * Flu Vaccine Example Service:
 * - Handles POST requests to our flu-vaccine-example endpoint
 * - This function should respond with an array of card(s) in JSON format for the patient-view hook
 *
 * - Service purpose: Display a recommendation to the provider if a patient is behind on their flu vaccinations.
 */
app.post('/cds-services/patient-vaccine-reminder', (request, response) => {

  // Parse the request body for the Patient prefetch resource
  const vaccineResource = request.body.prefetch.lastFluVaccine;
  const vaccineViewCard = createVaccineResponseCard(vaccineResource);
  response.send(JSON.stringify(vaccineViewCard, null, 2));
  response.status(200);
});

function createVaccineResponseCard(context) {
  const fluVaccineOnFile = context.total;

  // Check if any flu vaccines are on file
  if (fluVaccineOnFile) {
    // Return this card if the patient already has a flu vaccine < 9 months
    return {
      cards: [
        {
          summary: 'Flu vaccine up to date!',
          detail: 'Last vaccine was on ' + context.occurenceDateTime + '.',
          indicator: 'info',
          source: {
            label: 'CDS Service Tutorial',
            url: 'https://github.com/cerner/cds-services-tutorial/wiki/Order-Select-Service'
          }
        }
      ]
    };
  } else {
    // No vaccine on file
    return {
      cards: [
        {
          // Vaccine popup for flu vaccine
          summary: 'Flu vaccine recommended!',
          indicator: 'warning',
          detail: 'This patient currently has no flu vaccine on file.',
          source: {
            label: 'CDS Service Tutorial',
            url: 'https://github.com/cerner/cds-services-tutorial/wiki/Patient-View-Service'
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

// Here is where we define the port for the localhost server to setup
app.listen(3000);
