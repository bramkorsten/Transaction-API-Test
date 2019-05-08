var admin = require("firebase-admin");

// Fetch the service account key JSON file contents
var serviceAccount = require("./key.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://transaction-495f1.firebaseio.com"
});

var db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

// As an admin, the app has access to read and write all data, regardless of Security Rules
var ref = db.collection("products");
ref.get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      console.log(doc.id, '=>', doc.data());
    });
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });
