const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

app = express();
port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@pcdoctor.wwovwaa.mongodb.net/?retryWrites=true&w=majority`;

// const uri = `mongodb+srv://${[process.env.USER_NAME]}:${
//   process.env.USER_PASS
// }@walton-pc.ppiop.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("waltonpc").collection("parts");
    const ordersCollection = client.db("waltonpc").collection("orders");
    const userCollection = client.db("waltonpc").collection("users");
    const reviewCollection = client.db("waltonpc").collection("review");
    console.log("db connected");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // home server title
    app.get("/", (req, res) => {
      res.send("pc doctor Running Successfully.");
    });

    // user get
    app.get("/users", async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });
    // admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    // user admin api
   

    // Review Post api
    app.post("/review", async (req, res) => {
      const newProducts = req.body;
      const result = await reviewCollection.insertOne(newProducts);
      res.send(result);
    });
    // review get and load all data by reviews
    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find({}).toArray();
      res.send(review);
    });

    // get parts data
    app.get("/parts", async (req, res) => {
      const parts = await partsCollection.find({}).toArray();
      res.send(parts);
    });
    // get parts id api
    app.get("/parts/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });
    //parts collection post api
    app.post("/parts", async (req, res) => {
      const products = req.body;
      const result = await partsCollection.insertOne(products);
      res.send(result);
    });
    // delete a product
    app.delete("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(query);
      res.send(result);
    });

    //order collection post api
    // app.post('/orders', async (req, res) => {
    //   const orders = req.body;
    //   const result = await ordersCollection.insertOne(orders);
    //   res.send(result);
    // })
    // delete a order
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    // get orders
    app.get("/orders", async (req, res) => {
      const users = await ordersCollection.find().toArray();
      res.send(users);
    });
    // get orders by email
    app.get("/orderss", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      // console.log(email);
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = ordersCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // get user
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    // post user
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("walton server Running");
});
