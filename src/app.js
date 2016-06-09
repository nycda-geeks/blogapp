var Sequelize = require('sequelize');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var fs = require('fs')
var pg = require('pg')
var bcrypt = require('bcrypt')


var sequelize = new Sequelize('sarithbreedijk', 'sarithbreedijk', null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});


var user = sequelize.define('users', {
	name: {
		type: Sequelize.STRING,
		allowNull: false,
			validate: {
				notEmpty: true,
				len: [1,50]}
	},
	email: {
		type: Sequelize.STRING,
	allowNull: false,
		validate: {
			notEmpty: true,
			len: [1,55]}
		},
	password:{
		type: Sequelize.STRING,
		allowNull: false,
		validate: {
			notEmpty: true,
			len: [3, Infinity]},
		}
},
		{
	freezeTableName: true,
	instanceMethods: {
		generateHash: function(password) {
			return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
		},
		validPassword: function(password) {
			return bcrypt.compareSync(password, this.password);
		},
	}
		});


var message = sequelize.define('messages', {
	title: Sequelize.STRING,
	body: Sequelize.TEXT,
	user_id: Sequelize.INTEGER
});

var comment = sequelize.define('comment', {
	title: Sequelize.STRING,
	body: Sequelize.TEXT,
	message_id: Sequelize.INTEGER
});

user.hasMany(message);
message.belongsTo(user);
message.hasMany(comment);
comment.belongsTo(message);
user.hasMany(comment);
comment.belongsTo(user);

sequelize.sync({
	force: false
}).then(function() {
	console.log('sync done')
});


var app = express();


app.use(session({
	secret: 'oh wow very secret much security',
	resave: true,
	saveUninitialized: false
}));


app.set('views', './src/views');
app.set('view engine', 'jade');
app.use(express.static('./src'));
app.use(express.static('../js'));

app.get('/', function(request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});


app.get('/login', function(request, response) {
	response.render('login', {});
});


app.post('/login', bodyParser.urlencoded({
	extended: true
}), function(request, response) {
	if (request.body.email.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}

	if (request.body.password.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}

	user.findOne({
		where: {
			email: request.body.email
		}
	}).then(function(user) {
		var hashSecurePassword = request.body.password;
		bcrypt.compare(hashSecurePassword, user.password.toString(), function(err, result){
		if (user !== null && request.body.password === user.password) {
			request.session.user = user;
			response.redirect('/');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	}, function(error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});
});


app.get('/profile', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		var ID = request.session.user.id;
		message.findAll({
			where: {
				user_id: ID,
			}
		}).then(function(messages) {
			var Data = messages.map(function(appmessage) {
				return {
					title: appmessage.dataValues.title,
					body: appmessage.dataValues.body,
					user_id: appmessage.dataValues.user_id
				}


			})
			var allOwnMessages = Data;
		
			console.log(allOwnMessages);
			//console.log(allComments);
			response.render('profile', {
				allOwnMessages: allOwnMessages,
				name: request.session.user.name
			});
		});
	}});




app.get('/logout', function(request, response) {
	request.session.destroy(function(error) {
		if (error) {
			throw error;
		}
		response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});


app.get('/register', function(request, response) {
	response.render('register', {});
});


app.post('/register', bodyParser.urlencoded({
	extended: true
}), function(request, response) {
	user.create({
		name: request.body.name,
		email: request.body.email,
		password: request.body.password
	}).then(function() {
		if (typeof(user) == 'undefined') {
			response.redirect('/login')
		}
		if (typeof(user) !== 'undefined') {
			response.redirect('/?message=' + encodeURIComponent("This user already exists"));
			return;
		}

	});
});



app.get('/createpost', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		response.render('createpost', {});
	};
});


app.post('/createpost', bodyParser.urlencoded({
	extended: true
}), function(request, response) {
	var ID = request.session.user.id;

	message.create({
		title: request.body.title,
		body: request.body.body,
		user_id: ID

	}).then(function() {
		response.redirect('/overview')
	});
});


app.get('/overview', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		message.findAll().then(function(messages) {
			var data = messages.map(function(message) {
				return {
					title: message.dataValues.title,
					body: message.dataValues.body
				};
			});
			var allMessages = data;
			response.render('overview', {
				allMessages: allMessages

			});
		});
	};
});


app.post('/comments', bodyParser.urlencoded({extended: true}), function (request, response) {
			Promise.all([
				message.findOne({ 
					where: {
					 id: request.body.id 
					} 
				}),
				user.findOne({ 
					where: {
					 id: request.session.user.id 
					} 
				})
					]).then(function(allofthem){
					console.log(allofthem[2])
					allofthem[0].setUser(allofthem[1])
					allofthem[0].setPost(allofthem[2])
				}).then(function(){
					res.redirect('/overview')
				});
				})



app.get('/specific', function(request, response) {
	var usert = request.session.user;
	if (usert === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		user.findAll().then(function(users) {
			var everyOne = users.map(function(user) {
				return {
					name: user.dataValues.name,
					id: user.dataValues.id
				};
			});
			var allUsers = everyOne;
			console.log(allUsers);
			response.render('specific', {
				allUsers: allUsers
			});
		})
	};
});

 
app.get('/users/profile/:id', function(request, response) {
	var userID = request.params.id;
	var ID = request.session.user;
		console.log(userID)
		message.findAll({
			where: {
				user_id: userID
			}
			 
		}).then(function(messages) {
			var Data = messages.map(function(message) {
				return {
					id: message.dataValues.id,
					title: message.dataValues.title,
					body: message.dataValues.body,
					user_id: message.dataValues.user_id,
				}
			})
			allPosts = Data;
		}).then(function() {
			response.render('users/profile', {
				allUsersMessages: allPosts,
				userID: userID
			});
		});
});


var server = app.listen(3000, function() {
	console.log('Example app listening on port: ' + server.address().port);
});