const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
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
    const testsCollection = client.db('medidxDB').collection("tests");


    //jwt api 
   
    app.post('/jwt', async(req,res)=>{
      const user= req.body;
      const result = jwt.sign(user,process.env.SECRET_ACCESS_TOKEN,{expiresIn:'1h'});
      res.json({token:result});

    })


    //custom middleware

//verify token
const verifyToken =  (req,res,next)=>{
  // console.log('inside verify token', req.headers);
  if(!req.headers?.authorization){
    return res.status(401).json({message:"UnAuthorized Access"});
  }
  if(req.headers?.authorization){
    const token = (req.headers?.authorization).split(' ')[1];
    if(!token){
      return res.status(403).json({message: "Forbidden Access"})
    }
     jwt.verify(token,process.env.SECRET_ACCESS_TOKEN, (err,decoded)=>{
      if(err){
        return res.status(401).json({message:'Forbidden Access'})
      }
      // console.log(decoded);
      req.decoded=decoded;
          next();
    })
  }
}

    //verify admin
    const verifyAdmin = async (req,res,next)=>{
      const email = req.decoded?.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if(user?.role!=='admin'){
        return res.status(403).json({message:'unauthorize access'});
      }
      if(user?.role==='admin'){
        next();
      }
    }

    //check a user admin or not
    app.get('/users/admin',verifyToken, async(req,res)=> {
      const email = req.query.email;
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      let admin = false;
      if(user){
        user?.role ==='admin'?admin=true:admin=false;
      }
      return res.json(admin)

    })

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

   //user add to database post api
   app.post('/users', async(req,res)=> {
    const {email} = req.query;
    // console.log(email);
    const existsUser = await usersCollection.findOne({email:email});
    console.log(existsUser);
    if(existsUser){return res.json({message:"user already exists"})}
    if(!existsUser){
      const user = req.body;
       const result = await usersCollection.insertOne(user);
       res.json(result);
    }
    
 
   })

   //specific user by email
   app.get('/users', verifyToken, async(req,res)=>{
    // console.log('line number 76: ',req.headers.authorization.split(' ')[1]);
    const {email} = req.query;
    const result = await usersCollection.findOne({email});
    res.json(result);
   })
  
   //specific user by userID for admin
   app.get('/users/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.findOne(query);
      res.json(result);
   })


   //update a user information api
   app.patch('/users/:id',verifyToken, async(req,res)=>{
    // console.log('line number 84,', req.headers?.authorization);
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

   //get all users data by admin only
   app.get('/all-users',verifyToken,verifyAdmin, async(req,res)=> {
    const result = await usersCollection.find().toArray();
    res.json(result);
   })

   //update user status api
   app.patch('/users/status/:id',verifyToken,verifyAdmin, async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const userStatus = req.body;
    const updateStatus={
      $set:{
        status: userStatus.status
      }
    }
    // console.log(updateRole);
    const result = await usersCollection.updateOne(query,updateStatus);
    res.json(result);
   })


   // user role change api
   app.patch('/users/role/:id',verifyToken,verifyAdmin, async(req,res)=> {
    const id = req.params.id;
    const query = {_id:new ObjectId(id)};
    const updateRole = {
      $set:{
        role:'admin'
      }
    }
    const result = await usersCollection.updateOne(query,updateRole);
    res.json(result);

   })

   //All Test Related API
   //ADDTest
   app.post('/addTest',verifyToken,verifyAdmin, async(req,res)=>{
    const testInfo = req.body;
    // console.log(testInfo);
    const result = await testsCollection.insertOne(testInfo);
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