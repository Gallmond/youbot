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

// database
mongo = require('mongodb');

// crypto 
crypto = require('crypto');

// routing
express = require('express');
app = express();

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

	res.send("OK");

});



// ================================== TESTING
user_ = require('./utility/user.js');
user = new user_();

app.get(['/test'], (req, res)=>{
	
	// var str = helpers.template('email.verify_email', {foo: "bar"});
	// console.log("str", str);
	// res.send(str);

	helpers.template('email.verify_email', {verification_token: "thisistoken"}).then((obj)=>{
		// template resolve
		res.send(obj.str);

	},(obj)=>{
		// template reject	
		console.log("template reject", obj);
		res.send(obj.error);

	});


});
// ================================== TESTING


app.get('*', function (req, res) {
	res.status(404).send("page not found");
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});