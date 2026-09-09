const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();

const _hostname = window.location.hostname;
const IS_DEV = _hostname === "localhost" || _hostname.startsWith("127.") || _hostname.startsWith("192.168.") || _hostname.startsWith("10.") || _hostname === "::1" || _hostname.includes("--pr") || _hostname.includes("--preview");

if (IS_DEV) {
  const DB_PREFIX = "dev/";
  const _originalRef = database.ref.bind(database);
  database.ref = function(path) {
    if (path === undefined || path === null) return _originalRef(DB_PREFIX);
    if (path === "" || path === "/") return _originalRef(DB_PREFIX);
    if (path.startsWith(".info") || path.startsWith("dev/")) {
      return _originalRef(path);
    }
    return _originalRef(DB_PREFIX + path);
  };
  console.log("%c[DEV MODE] Firebase usando prefixo 'dev/'", "color: #f39c12; font-weight: bold;");
}
