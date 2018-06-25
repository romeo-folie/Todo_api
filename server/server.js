const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

const {mongoose} = require('./db/mongoose.js');
const {Todo} = require('./models/todo');
const {User} = require('./models/user');
const {ObjectID} = require('mongodb');

var app = express();

const port = process.env.PORT || 3000;

//middleware
app.use(bodyParser.json());

//GET /todos
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

//POST /todos
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



app.listen(port,()=>{
  console.log(`Server started on port ${port}`);
});


module.exports = {app};
