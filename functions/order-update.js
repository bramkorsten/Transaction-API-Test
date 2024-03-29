// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START order_update]

// Import the 'googleapis' module for authorizing the request.
const google = require('googleapis');

// Import the 'request' module for sending an HTTP POST request.
const request = require('request');

// Import the OrderUpdate class from the Actions on Google client library.
const {OrderUpdate} = require('actions-on-google');

// Import the service account key used to authorize the request. Replace the
// string path with a path to your service account key.
const key = require('./key.json');

// Create a new JWT client for the Actions API using credentials from the
// service account key.
let jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/actions.fulfillment.conversation'],
  null
);

// Authorize the client asynchronously, passing in a callback to run
// upon authorization.
jwtClient.authorize((err, tokens) => {
  if (err) {
    console.log(err);
    return;
  }

  // Get the current time in ISO 8601 format.
  const currentTime = new Date().toISOString();

  // Declare the ID of the order to update.
  const actionOrderId = '1235';

  // Declare the particular updated state of the order.
  const orderUpdate = new OrderUpdate({
    actionOrderId: actionOrderId,
    orderState: {
      label: 'Your order has been sent!',
      state: 'COMPLETED',
    },
    updateTime: currentTime,
  });

  // Set up the POST request header and body, including the authorized token
  // and order update.
  const bearer = 'Bearer ' + tokens.access_token;
  const options = {
    method: 'POST',
    url: 'https://actions.googleapis.com/v2/conversations:send',
    headers: {
      'Authorization': bearer,
    },
    body: {
      custom_push_message: {
        order_update: orderUpdate,
      },
      // The line below should be removed for non-sandbox transactions.
      is_in_sandbox: true,
    },
    json: true,
  };

  // Send the POST request to the Actions API.
  request.post(options, (err, httpResponse, body) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(body);
  });
});

// [END order_update]
