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

emailer = require('./utility/email.js');

var to = "gallmond@gmail.com";
var from = "gallmond+sendgrid@gmail.com";
var subject = "newproject test SUBJECT";
var emailbody = "here is the body of the html that is sent in the email";


var testEmail = new emailer(to, from, subject, emailbody); // (_to, _from, _subject, _emailbody)
testEmail.send().then((obj)=>{
	console.log("email then success");
	console.log(obj);
},(obj)=>{
	console.log("email then success");
	console.log(obj);
})

// cdb = require('./jobs/create_db.js');
// cdb.create();

// var thenTest = ()=>{
// 	return new Promise((resolve, reject)=>{

// 		if(Math.random()>0.7){
// 			console.log("thenTest fail");
// 			return reject({error:"failed"});
// 		}else{
// 			console.log("thenTest succeed");
// 			return resolve({success:"woo"});
// 		}

// 	});
// };



// thenTest().then((ob)=>{
// 	console.log("in first then success bit");
// 	console.log(ob);
// 	return ob;
// },
// (ob)=>{
// 	console.log("in first then fail bit");
// 	console.log(ob);
// 	return ob;
// }).then((ob)=>{
// 	console.log("in second then bit");
// 	console.log(ob);
// });