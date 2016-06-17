'use strict';
var express = require('express');
var router = express.Router();

// Body parsing in the router too...?
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true })); // for HTML form submits
router.use(bodyParser.json()); // would be for AJAX requests

module.exports = function makeRouterWithSockets (io,client) {
  // a reusable function
  function respondWithAllTweets (req, res, next){
    // client makes query 
    client.query('SELECT * FROM users INNER JOIN tweets ON tweets.userid = users.id', function(err,result){
      if(err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', {title:'Twitter.js', tweets: tweets, showForm: true});
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    var name = req.params.username;
    client.query('SELECT tweets.id, content, name, pictureurl FROM users INNER JOIN tweets ON tweets.userid = users.id WHERE name = $1', [name], 
      function(err,result){
        if(err) return next(err); // pas errors to Express
        var tweets = result.rows;
        res.render('index', {title:'Twitter.js - Tweets by ' + name, tweets: tweets});
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    var id = req.params.id;
    client.query('SELECT tweets.id, content, name, pictureurl FROM users INNER JOIN tweets ON tweets.userid = users.id WHERE tweets.id = $1', [Number(id)], 
      function(err,result){
        if(err) return next(err); // pas errors to Express
        var tweets = result.rows;
        res.render('index', {title:'Twitter.js - Tweet #Id ' + id, tweets: tweets});
    });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    var name = req.body.name;
    var content = req.body.content;
    var picurl = req.body.picurl;
    client.query('SELECT id FROM users WHERE name = $1', [name], function(err,result){
      if (err) return next(err);
      // If ID does not exist
      if (result.rowCount == 0){
        client.query('INSERT INTO users (name, pictureurl) VALUES ($1, $2)',[name,picurl],
          function(err,result){
            if(err) return next(err);
            client.query('SELECT id FROM users WHERE name = $1', [name],
              function (err,result){
                if(err) return next(err);
                var newid = result.rows[0].id;
                client.query('INSERT INTO tweets (userid, content) VALUES ($1,$2)', [newid,content],
                  function (err,result){
                    if(err) return next(err);
                    res.redirect('/');
                });
            });
        }); 
      // If USER ID already exists
      }else{
        client.query('SELECT id FROM users WHERE name = $1', [name],
          function (err,result){
            if(err) return next(err);
            var newid = result.rows[0].id;
            client.query('INSERT INTO tweets (userid, content) VALUES ($1,$2)', [newid,content],
              function (err,result){
                if(err) return next(err);
                res.redirect('/');
            });
        });
      } 
/*    io.sockets.emit('new_tweet', newTweet);*/
    });
  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
}
