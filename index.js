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
		parseBody(req); // adds post parameters to req.postparams
		next();
	});
});

if(process.env.APP_ENVIRONMENT === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sesssionOptions.cookie.secure = true // serve secure cookies
}


// signup and login page
app.get(['/signup','/login'], (req, res)=>{
	res.render('signup_login', {debug:process.env.APP_DEBUG, foo:"bar"} );	
});

// signup and login form handling
app.post(['/signup','/login'], (req, res)=>{



	res.send(JSON.stringify(req.params));


});

app.get('*', function (req, res) {
	res.status(404).send("page not found");
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

console.log("end of index.js");


// helper function to parse post bodies
parseBody = (req)=>{
	var rawBody = req.rawBody || ""; 
	var params = [];
	if( req.is('urlencoded') ){ // parse urlencoded foo=bar&hello=goodbye&one=two
		rawBody = rawBody.replace(/\+/gi, "%20"); // by default forms encode spaces as '+', not '%20'
		var bodyArr = rawBody.split("&"); // like ["foo=bar", "hello=goodbye", "one=two"]
		for(item in bodyArr){
			params[bodyArr[item].split("=")[0]] = decodeURIComponent(bodyArr[item].split("=")[1]);
		}
	}else if( req.is('json') ){ // like {"foo":"bar", "name":"gavin"}
		var parsedString = JSON.parse(rawBody);
		var keys = Object.keys(parsedString);
		for(var i = 0; i < keys.length; i++){
			params[keys[i]] = parsedString[keys[i]];
		}
	}
	req.postparams = params;
	return params;
}