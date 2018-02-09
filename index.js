// this manually puts the .env params into process.env when running with 'node index.js'
if(!process.env.APP_ENVIRONMENT || process.env.APP_ENVIRONMENT=="local"){
	var fs = require('fs');
	var envString = fs.readFileSync("./.env", {encoding:"utf-8"});
	var splitEnv = envString.split("\r\n");
	for(var i = 0; i<splitEnv.length; i++){
		var eIndex = splitEnv[i].indexOf("=");
		var left = splitEnv[i].substring(0,eIndex);
		var right = splitEnv[i].substring(eIndex+1);
		process.env[left] = right;
	}
}

debug = (process.env.APP_DEBUG==="true")

// database
mongo = require('mongodb');

// crypto 
crypto = require('crypto');

// routing
express = require('express');
app = express();

// ========== sessions start
var assert = require('assert');
session = require('express-session');
MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
	uri: process.env.MONGO_URL,
	collection: 'sessions'
});
// Catch errors
store.on('error', function(error) {
	assert.ifError(error);
	assert.ok(false);
});
// start session
var sesssionOptions = {
	secret: '7NFVOF8P',
	cookie: {},
	store: store,
	resave: false,
	saveUninitialized: false
}
app.use(session(sesssionOptions));
ssn = undefined;
app.use(function(req,res,next){
	if(req.session){
		ssn = req.session;
	}
	next();
});
// ========= sessions end

// templates
ejs = require('ejs'); // https://www.npmjs.com/package/ejs

// app config
app.set('view engine','ejs');
app.set('port', (process.env.PORT || 5000));

// app.use without a path runs on every requet
app.use(express.static(__dirname + '/public'));

// grab body data and insert into request.rawBody
app.use(function(req, res, next){
	var data = "";
	req.on('data', function(chunk){ data += chunk})
	req.on('end', function(){
		req.rawBody = data;
		helpers.parseBody(req); // adds post parameters to req.postparams
		next();
	});
});



// ===================== CUSTOM INITS
helpers = require('./utility/helpers.js');
user = require('./utility/user.js');
user = new user();
emailer = require('./utility/email.js');






// ===================== ROUTING BELOW
app.use(function(req, res, next){
	var requestingURL = req.protocol + '://' + req.get('host') + req.originalUrl;
	console.log(req.method+" request to "+requestingURL);
	next();
});


// signup and login page
app.get(['/signup','/login'], (req, res)=>{
	res.render('signup_login', {debug:process.env.APP_DEBUG, foo:"bar"} );	
});

// signup and login form handling
app.post(['/signup','/login'], (req, res)=>{

	if( req.postparams["form_type"]=="signup" ){ // if signup 

		// get input
		var email = String(req.postparams["signup_email"]);
		var pass = String(req.postparams["signup_password"]);

		user.signup(email, pass).then((obj)=>{
			// signup() resolve
			console.log("user.signup resolved:");
			console.log(obj);

		},(obj)=>{
			// signup() reject
			console.log("user.signup reject:");
			console.log(obj);

		})

		res.send("Thank you. Please check your email inbox for the verification link.");

	}else if( req.postparams["form_type"]=="login" ){ // if login
		
		// get in put
		var email = String(req.postparams["login_email"]);
		var pass = String(req.postparams["login_password"]);

		user.login(email, pass).then((obj)=>{
			// user.login resolve
			console.log("user.login resolve:");
			console.log(obj);
			res.send("LOGGED IN! ssn.logged_in: "+String(ssn.logged_in));

		},(obj)=>{
			// user.login reject
			console.log("user.login reject:");
			console.log(obj);
			res.send("FAILED TO LOG IN");

		});

	}
});

app.get('/logout', (req, res)=>{
	ssn.logged_in = false;
	res.send("LOGGED OUT");
});

// verification destination
app.get(['/verify_email/:token','/verify_email'], (req, res)=>{

	// if the token is defined from the url structure, attempt to verify the address
	if(req.params.token!=undefined || req.query.token!=undefined){

		console.log("req.params.token", req.params.token);	
		console.log("req.query.token", req.query.token);	

		if(req.params.token){
			var thisToken = req.params.token; 
		}else if(req.query.token){
			var thisToken = req.query.token; 

		}

		user.attemptEmailVerification(thisToken).then((obj)=>{
			// attemptEmailVerification resolve
			console.log("user.signup resolved:");
			console.log(obj);
			res.send("OK SEND TO LOGIN PAGE");
		},(obj)=>{
			// attemptEmailVerification reject
			console.log("user.signup resolved:");
			console.log(obj);

			res.render('verify_email', {debug:process.env.APP_DEBUG, verification_token:thisToken, error_message: obj.error});

		});


	}else{// if the token is not defined, show the submission form

		res.render('verify_email', {debug:process.env.APP_DEBUG, verification_token:req.params.token});
	}
});

// show page to request password reset
app.get(['/reset_password', '/reset_password/:password_reset_token'], (req, res)=>{

	// if the pass reset token is in the url, try doing that
	if(req.params.password_reset_token!=undefined){
		
		user.checkPasswordResetTokenValidity(req.params.password_reset_token).then((obj)=>{
			// checkPasswordResetTokenValidity resolve
			res.render('password_reset', {debug:process.env.APP_DEBUG, password_reset_token:obj.token});

		},(obj)=>{
			// checkPasswordResetTokenValidity reject
			console.log(obj);
			res.send("this token is either invalid or expired. Please request another");
		});

	}else{
		// if the token is not set, show the request page
		res.render('password_reset_request', {debug:process.env.APP_DEBUG});

	}

});
app.post(['/reset_password', '/reset_password/:password_reset_token'], (req,res)=>{

	// check params
	if(req.postparams["request_email"]!=undefined){

		var email = req.postparams["request_email"];

		user.requestPasswordResetToken(email).then((obj)=>{
			// requestPasswordResetToken resolve
			console.log(obj);
			res.send("please check emails for reset token");

		},(obj)=>{
			// requestPasswordResetToken reject
			console.log(obj);
			res.send("FAILED TO SEND PASS RESET");

		});

	}else if(req.postparams["reset_password"]!=undefined && req.postparams["reset_password_confirm"]!=undefined){

		// check passes are the same and valid
		if( !helpers.valid.password(req.postparams["reset_password"]) || (req.postparams["reset_password"]!=req.postparams["reset_password_confirm"]) ){
			res.send("This password is invalid or does not match");
		}else{

			// update password
			user.resetPassword(req.postparams["reset_password_token"], req.postparams["reset_password"]).then((obj)=>{
				// resetPassword resolve
				console.log(obj);
				res.send("PASSWORD WAS RESET REDIRECT TO LOGIN");

			},(obj)=>{
				// resetPassword reject
				console.log(obj);
				res.send("PASSWORD RESET FAILED");

			});


		}else{
			res.send("BAD FORM");	
		}

		
	};

});





// ================================== TESTING


app.get(['/test'], (req, res)=>{
	
	var r1 = helpers.randomString(36);

	console.log("r1", r1, "r1.length", r1.length);

	res.send("OK");

	//res.render('password_reset', {debug:process.env.APP_DEBUG, password_reset_token:false});

});
// ================================== TESTING


app.get('*', function (req, res) {
	res.status(404).send("page not found");
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});