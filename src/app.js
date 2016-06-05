var Sequelize = require('sequelize');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');


var sequelize = new Sequelize('sarithbreedijk', 'sarithbreedijk', null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});


var user = sequelize.define('user', {
	name: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING,
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

sequelize.sync({force: false}).then(function () {
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
app.use(express.static('src'));
app.use(express.static('../js'));

app.get('/', function(request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});


app.get('/login', function(request, response) {
	response.render('login', {
	});
});


app.post('/login', bodyParser.urlencoded({extended: true}), function(request, response) {
	if(request.body.email.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}

	if(request.body.password.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}

	user.findOne({
		where: {
			email: request.body.email
		}
	}).then(function(user) {
		if (user !== null && request.body.password === user.password) {
			request.session.user = user;
			response.redirect('/');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	}, function (error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});


app.get('/profile', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
	var ID = request.session.user.id;
	message.findAll({
		where:{
			user_id: ID,
		}
	}).then(function (messages) {
	var Data = messages.map(function (appmessage) {
		return {
			title: appmessage.dataValues.title,
			body: appmessage.dataValues.body,
			user_id: appmessage.dataValues.user_id
		}
	
	})	
	var allOwnMessages = Data;
		// console.log(allOwnMessages);
		console.log(allOwnMessages);
		response.render('profile', {
			allOwnMessages: allOwnMessages
				});
	})		
};
});



app.get('/logout', function(request, response) {
	request.session.destroy(function(error) {
		if(error) {
			throw error;
		}
		response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});


app.get('/register', function(request, response) {
	response.render('register', {
	});
});


app.post('/register', bodyParser.urlencoded({extended: true}), function(request, response) {
	user.create({
		name: request.body.name,
		email: request.body.email,
		password: request.body.password
	}).then(function(){
		if (typeof(user) == 'undefined'){
  			response.redirect('/login')
  		} if (typeof(user) !== 'undefined') {
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
	response.render('createpost', {
	});
};
});


app.post('/createpost', bodyParser.urlencoded({extended: true}), function(request, response) {
	var ID = request.session.user.id;

	message.create({
		title: request.body.title,
		body: request.body.body,
		user_id: ID

		}).then(function(){
  			response.redirect('/overview')
  		});
  	});
  	

app.get('/overview', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
	message.findAll().then(function (messages) {
	var data = messages.map(function (message) {
		return {
			title: message.dataValues.title,
			body: message.dataValues.body
		};	
	});
	var allMessages = data;
	response.render('overview', {
			allMessages:allMessages
		});
	}); 
	};
});

app.post('/comment', function(request, response){
	if(request.body.postComment != undefined){
		Promise.all([
			Comment.create({
				body: request.body.postComment
			}),
			User.findOne({
				where: {
					id: request.session.user.id
				}
			}),
			Post.findOne({
				where: {
					id: request.body.id
				}
			})
			]).then(function(allofthem){
				allofthem[0].setUser(allofthem[1])
				allofthem[0].setPost(allofthem[2])
			}).then(function(){
				res.redirect(req.body.origin)
			})
		}
		if(req.body.postComment === undefined) {
			res.redirect(req.body.origin + '?message=' + encodeURIComponent("Please write a comment first."))
		}

	})

app.get('/specific', function(request, response) {
	var usert = request.session.user;
	if (usert === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
	user.findAll().then(function (users) {
	var everyOne = users.map(function (user) {
		return {
			name: user.dataValues.name
		};
	});
	var allUsers = everyOne;
		console.log(allUsers);
		response.render('specific', {
			allUsers:allUsers
				});
	})		
};
});



 
var server = app.listen(3000, function() {
	console.log('Example app listening on port: ' + server.address().port);
});


