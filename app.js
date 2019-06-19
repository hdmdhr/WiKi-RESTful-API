// jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const app = express();

const saltRounds = 10;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
// EXL: look for a folder called public, all static resource should be placed in it: css, JS in browser, sounds, etc.
app.use(express.static('public'));

// ---------- Mongoose Stuff: connect, schema, model, pre-insert ----------

// connect locally
// mongoose.connect('mongodb://localhost:27017/wikiDB', {useNewUrlParser: true});

// connect to mongoDB Atlas Cluster
mongoose.connect('mongodb+srv://hdmdhr:85936560@frogcluster-w9k7j.mongodb.net/wikiDB?retryWrites=true&w=majority', {useNewUrlParser: true});


const articleSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String
});

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  username: String,  // username is used as an unique identifier to find a certain user
  password: String
});

const Article = mongoose.model('Article', articleSchema);
const User = mongoose.model('User', userSchema);


// ------- ROUTING --------
// ---- Artical Routing ----
// get/post/delete request targeting all articles
app.route("/articles")

  .get((req, res) => {
    Article.find((err, articles) => {
    res.send(err || articles);
  });})

  .post((req, res) => {
    // console.log(req.body.title,': ', req.body.content);
    const a = new Article(
      req.body
    );
    a.save((err) => {
      res.send(err || 'Congrats! The new article added successfully!');
    });
  })

  .delete((req, res) => {
    Article.deleteMany(err =>
      res.send(err || 'All articles were deleted successfully.')
    );
  });

// single targeting request
// get/put/patch an article by title
app.route('/articles/:title')

.get((req, res) => {
  Article.findOne({title: req.params.title}, (err, article) =>
    res.send(err || article || 'No article found under this title, consider creating a new one.')
  );
})
// put will REPLACE the old doc, should use patch whenever possible
.put((req, res) => {
  Article.findOne({title: req.params.title}, (err, article) => {
    if (!err && article) {
      Article.update(  // todo: Model.update is being depracated, use .updateOne instead
        {title: req.params.title},
        {title: req.body.title, content: req.body.content},
        {overwrite: true},  // false will leave a null value in DB, true will delete that field
        err => res.send(err || 'Congrats! Article updated successfully.')
      );
    } else res.send('No article found under this title, consider creating a new one.');
  });

})

.patch((req, res) => {
  Article.findOne({title: req.params.title}, (err, article) => {
    if (!err && article) {
      Article.updateOne(
        {title: req.params.title},
        {$set: req.body},
        err => res.send(err || 'Congrats! Article updated successfully.')
      );
    } else res.send('No article found under this title, consider creating a new one.');
  });
})

.delete((req, res) => {
  Article.findOne({title: req.params.title}, (err, article) => {
    if (!err && article) {
      Article.deleteOne(
        {title : req.params.title},
        err =>
          res.send(err || 'Congrats! Corresponding article was deleted successfully.')
        );
    } else res.send('No article found under this title, it may be already deleted.');
  });
});


// ---- User Routing ----

// GET
// get a user by username
app.get('/api.foo.com/profiles/:username', (req, res) => {
  User.findOne({username: req.params.username}, (err, user) => {
    if (!err) {
      if (user)  // found user
        res.send({'message': 'User Retrieved',
                  'data': {
                    'firstName': user.firstName,
                    'username': user.username,
                    'lastName': user.lastName
                    }
                  });
      else  // no match
        res.send('No user is using this username, do you want to register?');
    } else  // error occured
      res.send(err);
  });
});


// POST
// update user profile (assume identity is taken care by JWT)
// @Consume(username, firstName, lastName)
app.post('/api.foo.com/profiles/update', (req, res) => {
  User.findOne({username: req.body.username}, (err, user) => {
    if (!err && user) {
      User.updateOne(
        {username: req.body.username},
        {$set: {firstName: req.body.firstName, lastName: req.body.lastName}},
        err => res.send(err || 'Congrats! User profile updated successfully.')
      );
    } else res.send(`No user was found under username ${req.body.username}.`);
  });
});

// update user password
//@Consume(username, newPin [, oldPin])  * assume identity is veryfied through JWT, no need to check old password
app.post('/api.foo.com/password/change', (req, res) => {
  User.findOne({username: req.body.username}, (err, user) => {  // check if username exists
    if (!err && user) {
      bcrypt.hash(req.body.newPin, saltRounds, (err, hash) => {
        if (err){
          res.send(err);
          return;
        } else {
          User.updateOne(
            {username: req.body.username/*, password: req.body.oldPin*/},  // TODO: hash pin!
            {$set: {password: hash}},
            err => res.send(err || 'Congrats! User password updated successfully.')
          );
        }
      });
    } else res.send(`No user was found under username ${req.body.username}.`);
  });
});

// create a new user
//@Consume(firstName, lastName, username, password)
app.post('/api.foo.com/new-user', (req, res) => {
  User.findOne({username: req.body.username}, (err, user) => {
    if (user)
      res.send(`Username ${req.body.username} is already in use, please login.`);
    else {  // valid username, hash the password, insert new user

      bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        const newUser = new User({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          username: req.body.username,
          password: hash
        });
        newUser.save(err => res.send(err || 'Congrats! The new user added successfully!'));
      });
    }
  });
});






// LISTEN

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log(`Server started on port ${port}.`);
});
