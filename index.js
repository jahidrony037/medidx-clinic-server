const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const { MongoClient, ServerApiVersion, ObjectId, Int32 } = require('mongodb');
const { json } = require('stream/consumers');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
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
    const bannersCollection = client.db('medidxDB').collection("banners");
    const bookingsCollection = client.db('medidxDB').collection("bookings");


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
    const test = req.body;
    // console.log(testInfo);
    const testInfo = {
      testName: test?.testName,
      testPrice: new Int32(test?.testPrice),
      testDetails: test?.testDetails,
      slots: test?.slots,
      testImageURL: test?.testImageURL,
      testDate: test?.testDate,
    };
    const result = await testsCollection.insertOne(testInfo);
    res.json(result);
   })

   //Delete Test
   app.delete('/allTests/:id',verifyToken,verifyAdmin,async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await testsCollection.deleteOne(query);
    res.json(result);
   })

   //Update a Test
   //find a single test api
   app.get('/allTests/:id', verifyToken,async(req,res)=>{
    const id = req.params.id;
    const result = await testsCollection.findOne({_id:new ObjectId(id)});
    res.json(result);
   })

   //Update Test api
   app.patch('/allTests/:id',verifyToken,verifyAdmin,async(req,res)=>{
    const id = req.params.id;
    const query= {_id:new ObjectId(id)};
    const testInfo = req.body;
    const updateTestInfo = {
      $set:{
        testName: testInfo?.testName,
          testPrice: testInfo?.testPrice,
          testDetails: testInfo?.testDetails,
          slots: testInfo?.slots,
          testImageURL: testInfo?.testImageURL,
          testDate: testInfo?.testDate,
      }
    }
    const result = await testsCollection.updateOne(query,updateTestInfo,{upsert:true})
    res.json(result);
   })

   
  //get all Tests api
  app.get('/allTests',verifyToken,verifyAdmin, async(req,res)=>{
    const result = await testsCollection.find({}).toArray();
    res.json(result);
  })

  // get all testName by admin
  app.get('/allTestName',verifyToken,verifyAdmin, async(req,res)=>{
    const pipeline = [
      {
        $group: {
          _id: "$testName",
        },
      },
      {
        $project: {
          _id: 0,
          testName: "$_id",
        },
      },
    ];

    const testNames = await testsCollection.aggregate(pipeline).toArray();
    res.json(testNames);
  })

  //get available test for users and admin also
  app.get('/allAvailableTests', async(req,res)=>{
    const today = new Date();
    const result = await testsCollection.find({testDate:{$gte:today}}).toArray();
    res.json(result);
  })

  //get all available Tests by date 
  app.get('/availableTests', async(req,res)=>{
    const date = req.query?.date;
    // console.log(date);
    // const query = {testDate: date};
    // console.log(query);
    const result = await testsCollection.find({testDate: date}).toArray();
    res.json(result);

  })



  //Banner related api by Admin
   //Add Banner
   app.post('/addBanner', verifyToken,verifyAdmin, async(req,res)=>{
    const info = req.body;
    const bannerInfo= {
      bannerName: info?.bannerName,
          bannerTitle: info?.bannerTitle,
          bannerImageURL: info?.bannerImageURL,
          bannerDescription: info?.bannerDescription,
          couponCode: info?.couponCode,
          couponRate: new Int32(info?.couponRate) ,
          bannerActive:info?.bannerActive,
    }
    const result = await bannersCollection.insertOne(bannerInfo);
    res.json(result);
   })


   //Delete a banner api
   app.delete('/allBanners/:id', verifyToken,verifyAdmin, async(req,res)=>{
    const result = await bannersCollection.deleteOne({_id:new ObjectId(req.params.id)});
    res.send(result);
   })

   //banner Status Change api
   app.patch('/allBanners/:id', verifyToken,verifyAdmin, async(req,res)=>{
    const {bannerStatus} = req.body;
    // console.log(bannerStatus);
    const query = {_id:new ObjectId(req.params.id)}

    if(bannerStatus==='False'){
      const result = await bannersCollection.updateOne(query, {$set:{bannerActive:bannerStatus}});
     return res.json(result);
      
    }
   else{
    await bannersCollection.updateMany({},{$set:{bannerActive:'False'}})
   }
   const result = await bannersCollection.updateOne(query, {$set:{bannerActive:bannerStatus}});
   res.json(result);
   })


   //check already bookedTest or not
   app.post('/checkBookingTest',verifyToken,async(req,res)=>{
    const booking = req.body;
    const query= {
      appointmentDate: booking?.appointmentDate,
      email: booking?.email,
      testName: booking?.testName
    }
    // console.log(query);
    const alreadyBooked = await bookingsCollection.find(query).toArray();
    if(alreadyBooked.length){
      const message = `You Already have a booking on ${booking.appointmentDate} Try Another Day`
      return res.json({acknowledge: false, message})
    }
    else{
      return res.json({acknowledge:true})
    }
   })


   //test booking api
   app.post('/bookingsTest',verifyToken, async(req,res)=>{
    const booking = req.body;
    const id = booking?.testId;
    
    const test = await testsCollection.findOne({_id:new ObjectId(id)});
    const remainingSlots = test?.slots.filter((slot)=> slot!==booking.testTime)
    // console.log(remainingSlots);
    await testsCollection.updateOne({_id:new ObjectId(id)},{$set:{slots:remainingSlots}},{upsert:true})


    // console.log(bookingInfo);
    const result = await bookingsCollection.insertOne(booking);
    res.json(result);
   })

   //get bookedTest by user api
   app.get('/bookingsTest',verifyToken, async(req,res)=>{
      const email = req.query.email;
      // console.log(email);
      const query = {email:email};
      const result = await bookingsCollection.find(query).toArray();
      res.json(result);
   })

   //booking cancel by user
   app.delete('/bookingsTest/:id',verifyToken, async(req,res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)};
    // console.log(query);
    const result = await bookingsCollection.deleteOne(query);
    res.json(result);
   } )

   //all bookings get by testName
   app.get('/reservations', verifyToken,verifyAdmin, async(req,res)=>{
    const testName = req.query?.testName;
    // console.log(testName);
    const query= {testName:testName};
    const result = await bookingsCollection.find(query).toArray();
    res.json(result);
   })

   //reservation search by admin api
   app.get('/reservations/search', verifyToken,verifyAdmin, async(req,res)=>{
      const query = req.query?.email;
      const result = await bookingsCollection.find({email:{$regex:query,$options:'i'}}).toArray();
        res.json(result);
   })

   //for report submit by admin api
   app.patch('/reservations/:id', verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query={_id:new ObjectId(id)};
      const info = req.body;
      // console.log(info,query);
      const updateInfo= {
        $set:{
          reportLink:info?.reportLink,
          reportStatus:info?.reportStatus
        }
      }
      const result = await bookingsCollection.updateMany(query,updateInfo,{upsert:true});
      res.json(result);
   })

   //all test results api for user
   app.get('/testResults', verifyToken, async(req,res)=>{
    const mail = req.query.email;
    const query= {email:mail};
    const result = await bookingsCollection.find(query).toArray();
    res.json(result);
   })

   //specific Test Result by testId for user api
   app.get('/downloadResult/:id',verifyToken,async(req,res)=>{
    const id = req.params.id;
    const query={_id:new ObjectId(id),reportStatus:"delivered",paymentStatus:"paid"}
    const result = await bookingsCollection.findOne(query);
    res.json(result.reportLink);
   })
  
   // all banners 
   app.get('/allBanners', verifyToken,verifyAdmin, async(req,res)=>{
    const result = await bannersCollection.find().toArray();
    res.json(result);
   })

   //single banner id
   app.get('/activeBanner', async(req,res)=> {
    const query = {bannerActive:"True"};
    const result = await bannersCollection.findOne(query);
    res.json(result);
   })



   //payment related api

   //create-payment-intent
   app.post('/create-payment-intent',verifyToken, async(req,res)=>{
    const price = req.body.price;
    const priceInCent = Math.round((price/110)*100); 

    if(!price || priceInCent<1) return;

    //generate clientSecret
    const {client_secret} = await stripe.paymentIntents.create({
      amount:priceInCent,
      currency: 'usd',

      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
    })


    //send client secret as response
    res.json({clientSecret: client_secret})
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