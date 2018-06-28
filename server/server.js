require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

const {mongoose} = require('./db/mongoose.js');
const {Todo} = require('./models/todo');
const {User} = require('./models/user');
const {ObjectID} = require('mongodb');
const {authenticate} = require('./middleware/authenticate');
const bcrypt = require('bcryptjs');

var app = express();

const port = process.env.PORT;

//middleware
app.use(bodyParser.json());

//POST /todos
app.post('/todos',(req, res)=>{
  var todo = new Todo({
    text: req.body.text,
  });
  todo.save().then((doc)=>{
    res.send(doc);
  }, (e)=> {
    res.status(400).send(e);
  });
});

//GET /todos
app.get('/todos', (req,res)=>{
  Todo.find().then((todos)=>{
    res.send({todos})
  }, (e)=>{
    res.status(400).send(e);
  });
});

// GET /todos/_id for fetching individual todos
app.get('/todos/:id',(req, res)=>{
  var id = req.params.id;
  if(!ObjectID.isValid(id)){
    res.status(404).send();
  }

  Todo.findById(id).then((todo) =>{
    if(!todo){
    return res.status(404).send();
    }
    res.status(200).send({todo});
  }).catch(() => {
    res.status(400).send();
  });
});

//DELETE /todos/_id for deleting individual todos
app.delete('/todos/:id', (req, res)=>{
  var id = req.params.id;
  if(!ObjectID.isValid(id)){
    res.status(404).send();
  }

  Todo.findByIdAndRemove(id).then((todo) =>{
    if(!todo){
    return res.status(404).send();
    }
    res.status(200).send({todo});
  }).catch(()=>{
    res.status(400).send();
  });
});


app.patch('/todos/:id', (req, res)=>{
  var id = req.params.id;
  var body = _.pick(req.body, ['text', 'completed']);

  if(!ObjectID.isValid(id)){
    res.status(404).send();
  }

  if (_.isBoolean(body.completed) && body.completed){
    body.completedAt = new Date().getTime();
  }else{
    body.completed = false;
    body.completedAt = null;
  }

  Todo.findByIdAndUpdate(id,{$set: body}, {new: true}).then((todo)=>{
    if(!todo){
    return res.status(404).send();
    }
    res.status(200).send({todo});
  }).catch((e)=>{
    res.status(400).send();
  });
});

//POST /users
app.post('/users', (req, res)=>{
  var body = _.pick(req.body, ['email', 'password']);

  var user = new User(body);

  user.save().then(() =>{
    return user.generateAuthToken();
  }).then((token)=>{
    res.header('x-auth',token).status(200).send(user)
  }).catch((e)=>{
    res.status(400).send(e);
  });
});


// POST /users/login
app.post('/users/login', (req, res)=>{
  var body = _.pick(req.body, ['email', 'password']);
  User.findByCredentials(body.email, body.password).then((user) =>{
    user.generateAuthToken().then((token) =>{
      res.header('x-auth',token).status(200).send(user)
    });
  }).catch((e) => {
    res.status(400).send();
  });

});


app.get('/users/me', authenticate, (req, res)=>{
  res.send(req.user);
});


//LOGOUT
app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(()=>{
    res.status(200).send();
  }, ()=>{
    res.status(400).send();
  })
});



app.listen(port,()=>{
  console.log(`Server started on port ${port}`);
});


module.exports = {app};
