// routing
express = require('express');
app = express();

// database
mongo = require('mongodb'); // no var let or const for global

// crypto 
crypto = require('crypto');

// decoding
zlib = require('zlib');

// assert
assert = require('assert')

// sessions
// session = require('express-session');
// MongoDBStore = require('connect-mongodb-session')(session);

// templates
ejs = require('ejs'); // https://www.npmjs.com/package/ejs

// var store = new MongoDBStore({
// 	uri: process.env.MONGODB_URL,
// 	collection: 'sessions'
// });
// // Catch errors
// store.on('error', function(error) {
// 	assert.ifError(error);
// 	assert.ok(false);
// });

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
	   next();
   });
});

// start session // 7NFVOF8P
// var sesssionOptions = {
// 	secret: '7NFVOF8P',
// 	cookie: {},
// 	store: store,
// 	resave: false,
// 	saveUninitialized: false
// }

if(process.env.APP_ENVIRONMENT === 'production') {
	app.set('trust proxy', 1) // trust first proxy
	sesssionOptions.cookie.secure = true // serve secure cookies
}

// app.use(session(sesssionOptions))
// ssn = undefined;

app.use(function(req,res,next){
	if(req.session){
		ssn = req.session;
	}
	next();
});


app.get('*', function (req, res) {
	res.status(404).send("page not found");
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});




console.log("end of index.js");