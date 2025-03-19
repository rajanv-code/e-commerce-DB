require('dotenv').config();
const express= require('express');
const mongoose= require('mongoose');
const bcrypt= require('bcrypt');
const jwt= require('jsonwebtoken');
const cookieParser= require('cookie-parser');

const app= express();
app.use(express.json());
app.use(cookieParser());

const mongoString= process.env.DATABASE_URL
mongoose.connect(mongoString);
const db= mongoose.connection;
   
const routes= require('./routes/route');
app.use('/api', routes);  


db.on('error', (error)=>{
    console.log(error);
});
db.once('connected',()=>{
    console.log('Connected to MongoDB');
});

app.listen(3200,()=>{
    console.log('Server is running on port 3200');
})

// difference between framework and library 
//node express bycrpt cookies parser
