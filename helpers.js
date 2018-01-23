// adds post body params to req.postparams.
// Note this doesn't account for encoding and only uses two contenttypes so far
module.exports.parseBody = (_req)=>{
	var rawBody = _req.rawBody || ""; 
	var params = [];
	if( _req.is('urlencoded') ){ // parse urlencoded foo=bar&hello=goodbye&one=two
		rawBody = rawBody.replace(/\+/gi, "%20"); // by default forms encode spaces as '+', not '%20'
		var bodyArr = rawBody.split("&"); // like ["foo=bar", "hello=goodbye", "one=two"]
		for(item in bodyArr){
			params[bodyArr[item].split("=")[0]] = decodeURIComponent(bodyArr[item].split("=")[1]);
		}
	}else if( _req.is('json') ){ // like {"foo":"bar", "name":"gavin"}
		var parsedString = JSON.parse(rawBody);
		var keys = Object.keys(parsedString);
		for(var i = 0; i < keys.length; i++){
			params[keys[i]] = parsedString[keys[i]];
		}
	}
	_req.postparams = params;
	return params;
}

