if(process.env.NODE_ENV!="production")
{
   require('dotenv').config(); 
}



const express=require("express");
const app= express();
const mongoose=require("mongoose");
const path= require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError= require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const User= require("./models/user.js");

const listingRouter= require("./routes/listing.js");
const reviewRouter= require("./routes/review.js");
const userRouter= require("./routes/user.js");

const dburl=process.env.ATLASDP_URL;
main().then(()=> console.log("connection done")).catch(err => console.log(err));
async function main() {
  await mongoose.connect(dburl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const store = MongoStore.create({
    mongoUrl:dburl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
});
store.on("error",()=>{
    console.log("error in mongo session store",err);
});
const sessionOption ={
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie :{
        expires: Date.now() + 7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly: true,
    },
};

// app.get("/",(req,res)=>{
//     res.send("working");
// });



app.use(session(sessionOption)); //agr kuch add karna ho toh sessionOption mein add kar denge
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));   //passport wala seen hai ye sab ye 4 5 line imp hain

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


app.use("/listings",listingRouter);

app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);



app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found!"));
});

app.use((err,req,res,next)=>{
    let{statuscode =500, message = "something went wrong!" }=err;
    res.status(statuscode).render("error.ejs",{message});
});


app.listen(8080, () => {
    console.log("server is listening to port 8080");
});