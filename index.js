const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
const bodyParser = require("body-parser")
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI)
.then(console.log("DATABASE CONNECTION SUCCESSFUL"))
.catch((err) => console.error("DATABASE CONNECTION FAILED: " + err))

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/mongo-health", (req, res) => {
  res.json({status: mongoose.connection.readyState})
})

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
}, {versionKey: false})

const User = mongoose.model("User", userSchema);

// 1. You should provide your own project, not the example URL.
// 2. You can POST to /api/users with form data username to create a new user.
// 3. The returned response from POST /api/users with form data username will be an object with username and _id properties.

// .save() does not accept callbacks!
// app.post("/api/users", (req, res) => {
//   const username = req.body.username;
//   const user = new User({username})
//   user.save((err, data) => {
//     if(err) {
//       res.json({error: err})
//     }
//     res.json(data)
//   });
// })

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const user = new User({username});
  try{
    await user.save();
    res.json(user)
  }
  catch(err){
    console.error(err);
  }
})

// 4. You can make a GET request to /api/users to get a list of all users.
// 5. The GET request to /api/users returns an array.
// 6. Each element in the array returned from GET /api/users is an object literal containing a user's username and _id.

app.get("/api/users", async (req, res) => {
  const result = await User.find();
  try{
    res.send(result)
  }
  catch(err){
    res.json({error: err})
  }
})

// 7. You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
// 8. The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.

// Exercise:

// {
//   username: "fcc_test",
//   description: "test",
//   duration: 60,
//   date: "Mon Jan 01 1990",
//   _id: "5fb5853f734231456ccb3b05"
// }

const exerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String
}, {versionKey: false})

const Exercise = mongoose.model("Exercise", exerciseSchema)

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const {description, duration, date} = req.body;

  try{
    const user = await User.findById(id)
    if(!user){
      res.send("Could not find user")
    } else{
      const exerciseObj = new Exercise({
        userId: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
  }catch(err){
    console.log(err);
    res.send("There was an error saving the exercise")
  }
})

// You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user.
// A request to a user's log GET /api/users/:_id/logs returns a user object with a count property representing the number of exercises that belong to that user.
// A GET request to /api/users/:_id/logs will return the user object with a log array of all the exercises added.
// Each item in the log array that is returned from GET /api/users/:_id/logs is an object that should have a description, duration, and date properties.
// The description property of any object in the log array that is returned from GET /api/users/:_id/logs should be a string.
// The duration property of any object in the log array that is returned from GET /api/users/:_id/logs should be a number.
// The date property of any object in the log array that is returned from GET /api/users/:_id/logs should be a string. Use the dateString format of the Date API.
// You can add from, to and limit parameters to a GET /api/users/:_id/logs request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back.

// Log:

// {
//   username: "fcc_test",
//   count: 1,
//   _id: "5fb5853f734231456ccb3b05",
//   log: [{
//     description: "test",
//     duration: 60,
//     date: "Mon Jan 01 1990",
//   }]
// }

app.get("/api/users/:_id/logs", async (req, res) => {
  let {from, to, limit} = req.query;
  const userId = req.params._id;
  const foundUser = await User.findById(userId);

  if(!foundUser){
    res.json({message: "User not found"})
  }

  let filter = { userId }
  let dateFilter = {};
  if(from){
    dateFilter["$gte"] = new Date(from);
  }
  if(to){
    dateFilter["$lte"] = new Date(to);
  }
  if(from || to){
    filter.dateFilter = dateFilter
  }

  if(!limit){
    limit = 100;
  }

  let exercises = await Exercise.find({userId}).limit(limit);
  exercises = exercises.map((exercise) => {
    return{
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }
  })

  res.json({
    username: foundUser.username,
    count: exercises.length,
    id: userId,
    log: exercises
  })

})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})