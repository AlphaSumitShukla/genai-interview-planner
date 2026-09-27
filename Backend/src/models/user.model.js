const mongoose = require("mongoose");
require("dotenv").config();

const userSchema = new mongoose.Schema({
     username:{
         type:String,
         unique:[true,"Username already exists"],
         required:true,

     },
     email:{
          type:String,
          unique:[true,"Account already exists with this email"],
          required:true,

     },
     password:{
            type:String,
            required:true,
     }
})

const userModel = mongoose.model("user",userSchema)

module.exports = userModel