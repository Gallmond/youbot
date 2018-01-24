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

module.exports.valid = {
	email: (_email)=>{
		if(typeof _email != "string"){
			return false;
		}else{
			var matches = _email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/gi);
			if(matches.length!=null && matches.length==1 && matches[0]==_email){
				return true;
			}else{
				return false;
			}
		}
	},
	password: (_password)=>{
		if(typeof _password != "string"){
			return false;
		}else if(_password.length<(parseInt(process.env.PASSWORD_MIN_LEN) || 8)){ // too short
			return false;
		}else{
			return true;
		}
	}

}

module.exports.enc = (_string)=>{
	var algorithm = 'aes-256-ctr';
	var secret = process.env['ENC_KEY_'+process.env.CURRENT_ENC_KEY];
	var cipher = crypto.createCipher(algorithm,secret);
	var crypted = cipher.update(_string,'utf8','hex');
	crypted += cipher.final('hex');
	return String(process.env.CURRENT_ENC_KEY)+"_"+crypted;
}

module.exports.dec = (_string)=>{
	var string_parts = _string.split("_");
	var key_to_use = "ENC_KEY_"+string_parts[0];
	var encryptedString = string_parts[1];
	var algorithm = 'aes-256-ctr';
	var decipher = crypto.createDecipher(algorithm,process.env[key_to_use]);
	var dec = decipher.update(encryptedString,'hex','utf8')
	dec += decipher.final('utf8');
	return dec;
}