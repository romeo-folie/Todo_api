const expect = require('expect');
const request = require('supertest');

const {app} = require('./../server.js');
const {Todo} = require('./../models/todo');
const {ObjectID} = require('mongodb');

const todos = [{
  _id: new ObjectID(),
  text: "first test todo"
},{
  _id: new ObjectID(),
  text: "second test todo",
  completed: true,
  completedAt: 123321234
}];

//testing life cycle that allows us to run some code before every test case
beforeEach((done)=>{
  Todo.remove({}).then(()=> {
    return Todo.insertMany(todos);
  }).then(() => done());
});

describe('POST /todos', ()=>{
  it('should create a new todo', (done) => {
    var text = 'Test todo text';

    request(app)
    .post('/todos')
    .send({text})
    .expect(200)
    .expect((res)=>{
      expect(res.body.text).toBe(text);
    })
    .end((err, res) => {
      if (err){
        return done(err);
      }

      Todo.find({text}).then( (todos) =>{
        expect(todos.length).toBe(1);
        expect(todos[0].text).toBe(text);
        done();
      }).catch((e) => done(e));
    });

  });

  it('should not create todo with invalid body data', (done) => {
    request(app)
    .post('/todos')
    .send({})
    .expect(400)
    .end((err, res) =>{
      if (err){
        return done(err)
      }
      Todo.find().then((todos) => {
        expect(todos.length).toBe(2);
        done();
      }).catch((e) => done(e));
    });
  });


});



describe('GET /todos', () => {
  it('should get all todos', (done) => {
    request(app)
      .get('/todos')
      .expect(200)
      .expect((res)=>{
        expect(res.body.todos.length).toBe(2);
      })
      .end(done);
  });
});


describe('GET /todos/:id', ()=>{
  it('should return todo doc', (done) => {
    request(app)
    .get(`/todos/${todos[0]._id.toHexString()}`)
    .expect(200)
    .expect((res) => {
      expect(res.body.todo.text).toBe(todos[0].text);
    })
    .end(done);
  });

  it('should return a 404 if todo not found', (done) => {
    var newId = new ObjectID()
    request(app)
    .get(`/todos/${newId.toHexString()}`)
    .expect(404)
    done();
  });

  it('should return 404 for non object ids', (done) => {
      request(app)
      .get('/todos/123abx')
      .expect(404)
      done();
  });


});



describe('DELETE /todos/:id', ()=>{
  it('should remove a todo', (done) => {
    var hexId = todos[1]._id.toHexString();

    request(app)
    .delete(`/todos/${hexId}`)
    .expect(200)
    .expect((res)=>{
      expect(res.body.todo._id).toBe(hexId);
    })
    .end((err, res)=>{
      if (err){
        return done(err);
      }

      //query database using findById toNotExist
      //expect(todo).toNotExist();

      Todo.findById(hexId).then((todo) =>{
        expect(todo).toNotExist();
        done();
      }).catch((e) => done(e));

    });

  });


  it('should return 404 if todo not found', (done) => {
    var newId = new ObjectID().toHexString();
    request(app)
    .delete(`/todos/${newId}`)
    .expect(404)
    done();
  });

  it('should return 404 for non object ids', (done) => {
    request(app)
    .delete('/todos/123abx')
    .expect(404)
    done();

  });
});


describe('PATCH /todos/:id',()=>{
  it('should update the todo', (done) => {

    var id = todos[0]._id.toHexString();
    request(app)
    .patch(`/todos/${id}`)
    .send({text: "updated text", completed: true})
    .expect(200)
    .expect((res)=>{
      expect(res.body.todo.text).toBe("updated text");
      expect(res.body.todo.completed).toBe(true);
      expect(res.body.todo.completedAt).toBeA('number');
    }).end(done);
  });

  it('should clear completedAt when todo is not completed', (done) => {

    var id = todos[1]._id.toHexString();
    request(app)
    .patch(`/todos/${id}`)
    .send({text: "second test", completed: false})
    .expect(200)
    .expect((res)=>{
      expect(res.body.todo.text).toBe("second test");
      expect(res.body.todo.completed).toBe(false);
      expect(res.body.todo.completedAt).toNotExist();
    }).end(done);
  });



});
