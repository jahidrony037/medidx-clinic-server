const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middle wires
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.k7qynmg.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection


    const upazilaCollections = client.db('medidxDB').collection("upazila");
    const districtsCollection = client.db('medidxDB').collection("districts");
    const usersCollection = client.db('medidxDB').collection("users");

    //all upazila get api 
    app.get('/upazila', async(req,res)=>{
        const result = await upazilaCollections.find().toArray();
        res.json(result);
    })
    //all districts get api
   app.get('/districts', async(req,res)=>{
    const result = await districtsCollection.find().toArray();
    res.json(result);
   })

   //all users post api
   app.post('/users', async(req,res)=> {
    const {email} = req.query;
    // console.log(email);
    const existsUser = await usersCollection.findOne({email:email});
    
    if(!existsUser){
      const user = req.body;
       const result = await usersCollection.insertOne(user);
       res.json(result);
    }
    if(existsUser){res.status(400).json({message:"user already exists"})}
 
   })

   //specific user by email
   app.get('/users', async(req,res)=>{
    const {email} = req.query;
    const result = await usersCollection.findOne({email});
    res.json(result);
   })

   //update a user information api
   app.patch('/users/:id', async(req,res)=>{
    const id = req.params.id;
    const user = req.body;
    // console.log(id,user);
    const updateUser = {
      $set:{
        name: user?.name,
          imageURL: user?.imageURL,
          bloodGroup: user?.bloodGroup,
          district: user?.district,
          upazila: user?.upazila,
      }
    }
    const query = {_id: new ObjectId(id)};
    const result = await usersCollection.updateOne(query,updateUser);
    res.json(result);
   })








    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', (req,res)=>{
    res.json({message:"Medidx Clinic Server is Running...."})
})

app.listen(port,()=> {
    console.log(`app listing on port ${port}`);
})