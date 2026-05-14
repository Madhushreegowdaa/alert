const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());

let users = [];
let transactions = [];
let alerts = [];

let userIdCounter = 1;
let txnIdCounter = 1;
let alertIdCounter = 1;

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("join_user_room", (user_id) => {
    socket.join(user_id.toString());
    console.log(`User ${user_id} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.post("/users", (req, res) => {
  const { name } = req.body;

  const user = {
    user_id: userIdCounter++,
    name
  };

  users.push(user);

  res.status(201).json(user);
});

app.post("/transactions", (req, res) => {
  const { user_id, amount, location } = req.body;

  const user = users.find((u) => u.user_id == user_id);

  if (!user) {
    return res.status(404).json({
      message: "Invalid user_id"
    });
  }

  const transaction = {
    txn_id: txnIdCounter++,
    user_id,
    amount,
    location,
    timestamp: new Date()
  };

  transactions.push(transaction);

  let isFraud = false;
  let message = "";

  if (amount > 50000) {
    isFraud = true;
    message = "High amount transaction detected";
  }

  const userTransactions = transactions.filter(
    (t) => t.user_id == user_id
  );

  if (userTransactions.length > 1) {
    const previousTxn =
      userTransactions[userTransactions.length - 2];

    if (previousTxn.location !== location) {
      isFraud = true;
      message = "Location mismatch detected";
    }
  }

  if (isFraud) {
    const alert = {
      alert_id: alertIdCounter++,
      txn_id: transaction.txn_id,
      message
    };

    alerts.push(alert);

    io.to(user_id.toString()).emit("fraud_alert", {
      txn_id: transaction.txn_id,
      message,
      amount,
      location
    });
  }

  res.status(201).json({
    transaction,
    fraud: isFraud
  });
});

app.get("/alerts", (req, res) => {
  res.json(alerts);
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});