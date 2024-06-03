const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

//middle wires
app.use(cors());
app.use(express.json());




app.get('/', (req,res)=>{
    res.json({message:"Medidx Clinic Server is Running...."})
})

app.listen(port,()=> {
    console.log(`app listing on port ${port}`);
})