const expect = require('expect');
const request = require('supertest');

const {app} = require('./../server.js');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {ObjectID} = require('mongodb');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

//testing life cycle that allows us to run some code before every test case
beforeEach(populateUsers);
beforeEach(populateTodos);

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





describe('GET /users/me', ()=>{
  it('should return user if authenticated', (done) => {
    request(app)
    .get('/users/me')
    .set('x-auth', users[0].tokens[0].token)
    .expect(200)
    .expect((res)=>{
      expect(res.body._id).toBe(users[0]._id.toHexString());
      expect(res.body.email).toBe(users[0].email);
    })
    .end(done);

  });


  it('should return 401 if not authenticated', (done) => {
    request(app)
    .get('/users/me')
    .expect(401)
    .expect((res) => {
      expect(res.body).toEqual({});
    })
    .end(done);
  });
});


describe('POST /users', ()=>{
  it('should create a user', (done) => {
    var email = "somebody@something.com";
    var password = "123abc";

    request(app)
    .post('/users')
    .send({email, password})
    .expect(200)
    .expect((res)=>{
      expect(res.headers['x-auth']).toExist();
      expect(res.body._id).toExist();
      expect(res.body.email).toBe(email);
    })
    .end((err) => {
      if (err) {
        return done(err);
      }

      User.findOne({email}).then((user) =>{
        expect(user).toExist();
        expect(user.password).toNotBe(password);
        done();
      }).catch((e) => done(e));
    });
  });

  it('should return validation errors if request invalid', (done) => {
    //send across an invalid email or invalid password and expect validation errors and 400
    var email = "invalidemail.com"
    var password = "somep"
    request(app)
    .post('/users')
    .send({email, password})
    .expect(400)
    .end(done);
  });


  it('should not create user if email in use', (done) => {
  //send an email that already exists expect a 400
  var email = "jen@example.com";
  var password = "userTwoPass";
  request(app)
  .post('/users')
  .send({email, password})
  .expect(400)
  .end(done);
  });

});


describe('POST /users/login', () => {
  it('should login user and return auth token', (done) => {
    request(app)
    .post('/users/login')
    .send({
      email: users[1].email,
      password: users[1].password
    })
    .expect(200)
    .expect((res)=>{
      expect(res.headers['x-auth']).toExist();
    })
    .end((err, res) =>{
      if (err){
        return done(err);
      }
      User.findById(users[1]._id).then((user) => {
        expect(user.tokens[0]).toInclude({
          access: 'auth',
          token: res.headers['x-auth']
        });
        done();
      }).catch((e) => done(e));
    });
  });

  it('should reject invalid login', (done) => {
    //pass in invalid password. tweak expectations. check user token array to be zero.
    request(app)
    .post('/users/login')
    .send({
      email: users[1].email,
      password: "somep"
    })
    .expect(400)
    .expect((res)=>{
      expect(res.headers['x-auth']).toNotExist();
    })
    .end((err, res) =>{
      if (err){
        return done(err);
      }
      User.findById(users[1]._id).then((user) => {
        expect(user.tokens.length).toBe(0);
        done();
      }).catch((e) => done(e));
    });

  });

});



describe('DELETE /users/me/token',()=>{
  it('should remove auth token on logout', (done) => {
    var authToken = users[0].tokens[0].token
    request(app)
    .delete('/users/me/token')
    .set('x-auth', authToken)
    .expect(200)
    .end((err, res) => {
      if(err){
        return done(err);
      }
      User.findById(users[0]._id).then((user)=>{
        expect(user.tokens.length).toBe(0);
        done();
      }).catch((e) => done(e));
    });

  });
});
