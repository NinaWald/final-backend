import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/final-project";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello from Ninas backend!");
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  useremail: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (value) => {
        // Use a regular expression to validate the email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: 'Invalid email address',
    },
  },
  password: {
    type: String,
    required: true
  },
  isMember: {
    type: Boolean,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
});

UserSchema.pre('save', function (next) {
  if (this.isModified('useremail')) {
    this.useremail = this.useremail.toLowerCase();
  }
  next();
});


const User = mongoose.model("User", UserSchema);

app.post("/register", async(req, res) => {
  const {username, useremail, password} = req.body;
  try {
    const salt = bcrypt.genSaltSync();
    const newUser = await new User({
      username: username,
      useremail: useremail,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.status(201).json({
      success: true,
      response: {
        username: newUser.username,
        useremail: newUser.useremail,
        id: newUser._id,
        accessToken: newUser.accessToken
      }
    })
  } catch (e){
    res.status(400).json({
      success: false,
      response: e
    })
  }
})
// login
app.post("/login", async(req, res) => {
  const { username, useremail, password } = req.body;
  try {
    const user = await User.findOne({username})
    if (user && bcrypt.compareSync(password, user.password)) {
      user.isMember = true;
      user.discount = 0.1; // 10% discount represented as 0.1
      await user.save();

      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          useremail: user.useremail,
          accessToken: user.accessToken,
          discount: user.discount,
        }
      })} else {
        res.status(401).json({
          success: false,
          response: "Credentials do not match"
        })
      }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    })
  }
})

// Authenticate the user

const authenticateUser = async (req, res, next) => {
  const accessToken = req.headers.authorization;
  try {
    const user = await User.findOne({accessToken: accessToken});
    if (user) {
      next();
    } else {
      res.status(401).json({
        success: false,
        response: "Request failed"
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
}


app.delete("/delete/:id", authenticateUser, async (req, res) => {
  const userId = req.params.id;

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if(deletedUser) {
      res.status(200).json({
        success: true,
        response: "User deleted successfully"
      });
    } else {
      res.status(404).json({
        success: false,
        response: "User not deleted"
      });
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
});
/*
By adding authenticateUser as a second argument to the app.delete function, 
you make sure that the authenticateUser middleware is executed before the callback function for the /delete/:id route. 
This means that before the user can delete a user, the authenticateUser middleware will first verify the user's access token.
*/




// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

/*
If you want to represent the discount as a percentage, 
you can modify the code to store the discount value as a decimal fraction. 
For example, if you want to represent a 10% discount, 
you would store the value 0.1 in the discount field.
With this change, when you retrieve the discount value in your frontend, 
you can calculate the discounted price by multiplying it with the original price. 
For example, if the original price is $100, and 
the discount value is 0.1, you can calculate the discounted price as $100 - ($100 * 0.1) = $90.
*/