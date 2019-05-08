"use strict";

process.env.DEBUG = "actions-on-google:*";
const {
  dialogflow,
  DeliveryAddress,
  OrderUpdate,
  LineItem,
  SignIn,
  TransactionDecision,
  TransactionRequirements,
  Suggestions,
  SimpleResponse,
  Carousel,
  List,
  Image
} = require("actions-on-google");
const functions = require("firebase-functions");

const Order = require("transaction-order");

const orderSettings = {
  currencyCode: "EUR",
  names: {
    subtotal: "Subtotaal",
    tax: "Btw"
  }
};

var admin = require("firebase-admin");

var uniqid = require("uniqid");

var serviceAccount = require("./key.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://transaction-495f1.firebaseio.com"
});

var db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

const app = dialogflow({ debug: true });

const GENERIC_EXTENSION_TYPE =
  "type.googleapis.com/google.actions.v2.orders.GenericExtension";

const suggestIntents = ["Bestelling plaatsen", "Help"];

app.intent("Default Welcome Intent", conv => {
  conv.contexts.set("start_conversation", 2);
  conv.ask(
    new SimpleResponse({
      speech: "  Hey! Wil je graag een bestelling plaatsen?",
      text:
        "  Hey! Welkom bij Houben Worstenbroodjes. Wil je graag een bestelling plaatsen?"
    })
  );
  conv.ask(new Suggestions(suggestIntents));
});

app.intent("Bestellen", conv => {
  conv.contexts.set("start_conversation", 0);
  conv.contexts.set("in_cart_creation", 5);
  const order = new Order(orderSettings);
  order.setMerchant("houben_worstenbroodjes", "Houben Worstenbroodjes");
  conv.data.unique_order_id = order.getOrderId();

  conv.data.order = JSON.stringify(order.get());

  conv.ask(
    new TransactionRequirements({
      orderOptions: {
        requestDeliveryAddress: false
      },
      paymentOptions: {
        actionProvidedOptions: {
          displayName: "VISA-1234",
          paymentType: "PAYMENT_CARD"
        }
      }
    })
  );
  // conv.ask(new Suggestions(suggestIntents));
});

// app.intent("Transaction Merchant", conv => {
//   conv.contexts.set("merchant_pay", 5);
//   conv.ask(
//     new TransactionRequirements({
//       orderOptions: {
//         requestDeliveryAddress: false
//       },
//       paymentOptions: {
//         actionProvidedOptions: {
//           displayName: "VISA-1234",
//           paymentType: "PAYMENT_CARD"
//         }
//       }
//     })
//   );
// });
//
// app.intent("Transaction Google", conv => {
//   conv.contexts.set("google_pay", 5);
//   conv.ask(
//     new TransactionRequirements({
//       orderOptions: {
//         requestDeliveryAddress: false
//       },
//       paymentOptions: {
//         googleProvidedOptions: {
//           prepaidCardDisallowed: false,
//           supportedCardNetworks: ["VISA", "AMEX", "DISCOVER", "MASTERCARD"],
//           tokenizationParameters: {
//             // Tokenization parameter data will be provided by a
//             // payment processor, i.e. Stripe, Braintree, Vantiv, etc.
//             parameters: {
//               gateway: "braintree",
//               "braintree:sdkVersion": "1.4.0",
//               "braintree:apiVersion": "v1",
//               "braintree:merchantId": "xxxxxxxxxxx",
//               "braintree:clientKey": "sandbox_xxxxxxxxxxxxxxx",
//               "braintree:authorizationFingerprint": "sandbox_xxxxxxxxxxxxxxx"
//             },
//             tokenizationType: "PAYMENT_GATEWAY"
//           }
//         }
//       }
//     })
//   );
// });

app.intent("Transaction Check Complete", async conv => {
  const arg = conv.arguments.get("TRANSACTION_REQUIREMENTS_CHECK_RESULT");
  if (arg && arg.resultType === "OK") {
    // Normally take the user through cart building flow

    const products = await getProducts();
    conv.ask(
      new SimpleResponse({
        speech: "Wat voor worstenbroodje wil je graag hebben?",
        text:
          "Wat voor worstenbroodje wil je graag hebben? " +
          "Ik heb alvast wat soorten onder elkaar gezet."
      })
    );
    conv.ask(
      new Carousel({
        items: products
      })
    );
    conv.ask(new Suggestions(["Normaal worstenbroodje"]));
  } else {
    conv.close(
      "Sorry, maar er ging iets fout tijdens het valideren van je transactie gegevens. Probeer het opnieuw"
    );
  }
});

app.intent("Bestelling Item Toevoegen", (conv, params) => {
  conv.contexts.set("in_cart_creation", 5);
  conv.contexts.set("finish_cart_creation", 2);
  const worstenbroodjes = {
    "Normaal Worstenbroodje": {
      id: "01",
      price: 3.3,
      singular: "normaal worstenbroodje",
      plural: "normale worstenbroodjes"
    },
    Mieneke: {
      id: "02",
      price: 1.3,
      singular: "mieneke",
      plural: "mienekes"
    },
    "Vegetarisch Worstenbroodje": {
      id: "03",
      price: 3.3,
      singular: "vegetarisch worstenbroodje",
      plural: "vegetarische worstenbroodjes"
    },
    "Truffel Worstenbroodje": {
      id: "04",
      price: 4.1,
      singular: "truffel worstenbroodje",
      plural: "truffel worstenbroodjes"
    }
  };
  const worstenbroodje = worstenbroodjes[params.worstenbroodje];
  let amount = params.amount;
  if (amount == undefined || amount == "") {
    amount = 1;
  }
  console.log(worstenbroodje, amount);
  const order = new Order(orderSettings, JSON.parse(conv.data.order));
  const id = uniqid();
  for (var i = 0; i < amount; i++) {
    order.addItem(
      worstenbroodje.id,
      params.worstenbroodje,
      worstenbroodje.price,
      ""
    );
  }

  conv.data.order = JSON.stringify(order.get());
  if (amount == 1) {
    conv.ask(
      new SimpleResponse({
        speech:
          "Ik heb " +
          amount +
          " " +
          worstenbroodje.singular +
          " toegevoegd aan je bestelling",
        text:
          "Ik heb " +
          amount +
          " " +
          worstenbroodje.singular +
          " toegevoegd aan je bestelling"
      })
    );
  } else {
    conv.ask(
      new SimpleResponse({
        speech:
          "Ik heb " +
          amount +
          " " +
          worstenbroodje.plural +
          " toegevoegd aan je bestelling",
        text:
          "Ik heb " +
          amount +
          " " +
          worstenbroodje.plural +
          " toegevoegd aan je bestelling"
      })
    );
  }

  var possibleResponse = [
    "Wil je nog iets bestellen?",
    "Wil je verder nog iets?",
    "Verder nog iets?",
    "Kan ik verder nog iets voor je doen?"
  ];

  var pick = Math.floor(Math.random() * possibleResponse.length);
  var response = possibleResponse[pick];
  conv.ask(new SimpleResponse(response));
});

app.intent("Bestelling klaar", conv => {
  conv.ask(
    new DeliveryAddress({
      addressOptions: {
        reason: "Om te weten waar ik de worstenbroodjes naartoe moet sturen"
      }
    })
  );
});

app.intent("Delivery Address", conv => {
  conv.ask(
    new DeliveryAddress({
      addressOptions: {
        reason: "To know where to send the order"
      }
    })
  );
});

app.intent("Delivery Address Complete", conv => {
  const arg = conv.arguments.get("DELIVERY_ADDRESS_VALUE");
  if (arg.userDecision === "ACCEPTED") {
    conv.contexts.set("in_payment", 2);
    console.log(
      "DELIVERY ADDRESS: " + arg.location.postalAddress.addressLines[0]
    );
    conv.data.deliveryAddress = arg.location;
    conv.ask("Oke! Ik weet waar ik de bestelling naartoe moet sturen");
    conv.ask("Wil je betalen, of wil je toch nog iets veranderen?");
    // conv.followup("Transaction Decision");
  } else {
    conv.close(
      "Het is niet gelukt om je adres te vinden. Probeer het later opnieuw."
    );
  }
});

app.intent("Transaction Decision", conv => {
  // Each order needs to have a unique ID
  console.log("state 1");
  const order = new Order(orderSettings, JSON.parse(conv.data.order));
  let orderObject = order.get();
  orderObject.totalPrice.type = "ESTIMATE";
  console.log(orderObject);
  console.log("state 2");
  if (conv.data.deliveryAddress) {
    orderObject.extension = {
      "@type": GENERIC_EXTENSION_TYPE,
      locations: [
        {
          type: "DELIVERY",
          location: {
            postalAddress: conv.data.deliveryAddress.postalAddress
          }
        }
      ]
    };
  }
  console.log("state 3");

  if (conv.contexts.get("google_pay") != null) {
    console.log("state 4 - google pay");
    conv.ask(
      new TransactionDecision({
        orderOptions: {
          requestDeliveryAddress: true
        },
        paymentOptions: {
          googleProvidedOptions: {
            prepaidCardDisallowed: false,
            supportedCardNetworks: ["VISA", "AMEX", "DISCOVER", "MASTERCARD"],
            tokenizationParameters: {
              // Tokenization parameter data  will be provided by
              // a payment processor, like Stripe, Braintree, Vantiv, etc.
              parameters: {
                gateway: "braintree",
                "braintree:sdkVersion": "1.4.0",
                "braintree:apiVersion": "v1",
                "braintree:merchantId": "xxxxxxxxxxx",
                "braintree:clientKey": "sandbox_xxxxxxxxxxxxxxx",
                "braintree:authorizationFingerprint": "sandbox_xxxxxxxxxxxxxxx"
              },
              tokenizationType: "PAYMENT_GATEWAY"
            }
          }
        },
        proposedOrder: orderObject
      })
    );
  } else {
    console.log("state 4 - merchant transaction");
    // conv.ask("Hier is je bestelling.");
    conv.data.order = "";
    const transaction = new TransactionDecision({
      orderOptions: {
        requestDeliveryAddress: false
      },
      paymentOptions: {
        actionProvidedOptions: {
          paymentType: "PAYMENT_CARD",
          displayName: "VISA-1234"
        }
      },
      proposedOrder: orderObject
    });
    console.log(transaction);
    conv.ask(transaction);
  }
});

app.intent("Transaction Decision Complete", conv => {
  console.log("state 5");
  console.log("Transaction decision complete");
  const arg = conv.arguments.get("TRANSACTION_DECISION_VALUE");
  if (arg && arg.userDecision === "ORDER_ACCEPTED") {
    const finalOrderId = arg.order.finalOrder.id;

    if (conv.contexts.get("google_pay") != null) {
      const paymentDisplayName = arg.order.paymentInfo.displayName;
    }

    conv.ask(
      new OrderUpdate({
        actionOrderId: finalOrderId,
        orderState: {
          label: "Bestelling Geplaatst",
          state: "CREATED"
        },
        lineItemUpdates: {},
        updateTime: new Date().toISOString(),
        receipt: {
          confirmedActionOrderId: conv.data.unique_order_id
        },
        orderManagementActions: [
          {
            button: {
              openUrlAction: {
                // Replace the URL with your own customer service page
                url: "https://houbenworstenbrood.nl/klantenservice"
              },
              title: "Klantenservice"
            },
            type: "CUSTOMER_SERVICE"
          }
        ],
        userNotification: {
          text:
            "Je bestelling is geplaatst! We sturen je een notificatie als er een update is!",
          title: "Bestelling geplaatst!"
        }
      })
    );
    conv.close(
      `Je bestelling is geplaatst! Je bestelnummer is: ${
        conv.data.unique_order_id
      }. Bedankt voor je bestelling!`
    );
  } else if (arg && arg.userDecision === "DELIVERY_ADDRESS_UPDATED") {
    conv.ask(
      new DeliveryAddress({
        addressOptions: {
          reason: "Om te weten waar ik de worstenbroodjes naartoe moet sturen"
        }
      })
    );
  } else {
    conv.close(
      "Er is iets misgegaan tijdens het betalen. Probeer het alsjeblieft opnieuw"
    );
  }
});

const getProducts = () => {
  return new Promise(function(resolve, reject) {
    const productReference = db.collection("products");
    let products = {};

    productReference
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const data = doc.data();
          const item = {
            synonyms: [data.name],
            title: data.name,
            description: data.description,
            image: new Image({
              url: data.image,
              alt: data.name + " afbeelding"
            })
          };
          products[doc.id] = item;
        });
        resolve(products);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.webhook = functions.https.onRequest(app);
