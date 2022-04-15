const express = require('express'),
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  cors = require('cors');

const app = express();
const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect('mongodb://localhost:27017/myFlixDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const allowedOrigins = ['http:/localhost:8080'];

app.use(morgan('common'));

// Not quite where the instruction says to place it, but it makes sense to me.

app.use(cors());
/*app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let message =
          'The CORS policy for this application doesn’t allow access from origin ' +
          origin;
        return callback(new Error(message), false);
      }
      return callback(null, true);
    }
  })
);*/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

const auth = require('./auth')(app);

const passport = require('passport');
require('./passport');

app.get('/', (req, res) => {
  res.send('Welcome to myFlix, My Site for Your Favorite Movies.');
});

// Getting information on movies.

app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.find({}, (err, movieList) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error' + err);
      } else {
        res.status(200).json(movieList);
      }
    });
  }
);

app.get(
  '/movies/:title',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.title }, (err, movie) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error' + err);
      } else if (movie) {
        res.status(200).json(movie);
      } else {
        res.status(404).send(req.params.title + ' was not found.');
      }
    });
  }
);

app.get(
  '/movies/genres/:name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Genre.Name': req.params.name }, (err, movie) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error' + err);
      } else if (movie) {
        res.status(200).json(movie.Genre);
      } else {
        res.status(404).send(req.params.name + ' was not found.');
      }
    });
  }
);

app.get(
  '/movies/directors/:name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Director.Name': req.params.name }, (err, movie) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error' + err);
      } else if (movie) {
        res.status(200).json(movie.Director);
      } else {
        res.status(404).send(req.params.name + ' was not found.');
      }
    });
  }
);

// Methods applying to users

// Get all users. To be deleted once the project is finished.

app.get('/users', (req, res) => {
  Users.find({}, (err, userList) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error' + err);
    } else {
      res.status(200).json(userList);
    }
  });
});

// Get data of a single user by username

app.get(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOne({ Username: req.params.Username }, (err, user) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error' + err);
      } else if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).send(req.params.Username + ' was not found.');
      }
    });
  }
);

// Add a new user

app.post('/users', (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username }, (err, user) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error' + err);
    } else if (user) {
      res.status(400).send(req.body.Username + ' already exists.');
    } else {
      Users.create(
        {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
        (err, newUser) => {
          if (err) {
            console.error(err);
            res.status(500).send('Error' + err);
          } else {
            res.status(201).json(newUser);
          }
        }
      );
    }
  });
});

// Change user's data

app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else if (updatedUser) {
          res.status(200).json(updatedUser);
        } else {
          res.status(404).send(req.params.Username + ' was not found.');
        }
      }
    );
  }
);

// Delete a user by Username

app.delete(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndRemove(
      { Username: req.params.Username },
      (err, deletedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error:' + err);
        } else if (deletedUser) {
          res.status(200).send(req.params.Username + ' has been deleted');
        } else {
          res.status(400).send(req.params.Username + ' was not found.');
        }
      }
    );
  }
);

// Get list of user's favorite movies

app.get(
  '/users/:Username/favorites',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOne({ Username: req.params.Username }, (err, user) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error:' + err);
      } else if (user) {
        res.status(200).json(user.FavoriteMovies);
      } else {
        res.status(404).send(req.params.Username + ' was not found.');
      }
    });
  }
);

// Add movie to user's favorite movies,

app.put(
  '/users/:Username/favorites/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error:' + err);
        } else if (updatedUser) {
          res.status(200).json(updatedUser.FavoriteMovies);
        } else {
          res.status(404).send(req.params.Username + ' was not found.');
        }
      }
    );
  }
);

// Delete movie from user's favorite movies.

app.delete(
  '/users/:Username/favorites/:MovieId',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      { $pull: { FavoriteMovies: req.params.MovieId } },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else if (updatedUser) {
          res.status(200).send('The movie was removed.');
        } else {
          res.status(404).send(req.params.Username + ' was not found.');
        }
      }
    );
  }
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error');
});

app.listen(8080, () => {
  console.log('Server is running on Port 8080');
});
