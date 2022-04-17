const express = require('express'),
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  cors = require('cors');

const { check, validationResult } = require('express-validator');

const app = express();
const Movies = Models.Movie;
const Users = Models.User;

/*mongoose.connect('mongodb://localhost:27017/myFlixDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});*/

mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const allowedOrigins = ['http:/localhost:8080'];

app.use(morgan('common'));
app.use(cors());
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

app.post(
  '/users',
  check('Username')
    .isLength({ min: 5 })
    .withMessage('Username must be at least five characters long.')
    .isAlphanumeric()
    .withMessage('Username must contain only alphanumeric characters.'),
  check('Password')
    .isLength({ min: 8 })
    .withMessage('Password needs to be at least eight charcters long.'),
  check('Email')
    .isEmail()
    .withMessage('Email does nor appear to be valid.'),
  check('Birthday')
    .optional()
    .isDate()
    .withMessage('Invalid date. Date should be of the form YYYY-MM-DD.'),
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

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
  }
);

// Change user's data

app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  check('Username')
    .optional()
    .isLength({ min: 5 })
    .isAlphanumeric()
    .withMessage('Username must contain only alphanumeric characters long.'),
  check('Password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password needs to be at least eight charcters long.'),
  check('Email')
    .optional()
    .isEmail()
    .withMessage('Email does nor appear to be valid.'),
  check('Birthday')
    .optional()
    .isDate()
    .withMessage('Invalid date. Date should be of the form YYYY-MM-DD.'),
  (req, res) => {

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);

    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
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

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
