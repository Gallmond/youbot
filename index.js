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

if(process.env.APP_ENVIRONMENT === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sesssionOptions.cookie.secure = true // serve secure cookies
}

// ===================== CUSTOM INITS
helpers = require('./helpers.js');






// ===================== ROUTING BELOW

// signup and login page
app.get(['/signup','/login'], (req, res)=>{
	res.render('signup_login', {debug:process.env.APP_DEBUG, foo:"bar"} );	
});

// signup and login form handling
app.post(['/signup','/login'], (req, res)=>{
	var paramString = "";
	for(var key in req.postparams){
		paramString+= key+": "+req.postparams[key]+"<br />";
	}
	res.send(paramString);
});



// ================================== TESTING
user_ = require('./utility/user.js');
user = new user_();

app.get(['/test'], (req, res)=>{
	
	var plain = "this is a plaintext string";
console.log("plain",plain);
	var enc = helpers.enc(plain);
console.log("enc",enc);
	var dec = helpers.dec(enc);
console.log("dec",dec);

	res.send("OK");

});
// ================================== TESTING


app.get('*', function (req, res) {
	res.status(404).send("page not found");
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});