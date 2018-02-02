module.exports = function(){
	this.crypto = (typeof crypto === "undefined" ? require('crypto') : crypto);
	this.mongo = (typeof mongo === "undefined" ? require('mongodb') : mongo);
	this.generatePassword = (_plaintextpass)=>{
		var salt = this.crypto.randomBytes(16).toString('hex'); // 32 char as hex
		var derrivedKey = this.crypto.pbkdf2Sync(_plaintextpass, salt, 100000, 512, 'sha512');
		var hexDerrivedKey = derrivedKey.toString('hex');
		var passOutput = salt+""+hexDerrivedKey;
		return passOutput;
	};

	this.sendVerifyEmail = (_userid)=>{
		return new Promise((resolve, reject)=>{
			if(process.env.APP_DEBUG=="true"){
				console.log("in sendVerifyEmail");
			}

		});
	};// sendVerifyEmail end
	
	this.signup = (_email, _password)=>{
		return new Promise((resolve, reject)=>{

			if( !helpers.valid.password(_password) || !helpers.valid.email(_email)){
				return reject({error:"invalid password or email"});
			}

			// generate this user's password
			var hashedPassword = this.generatePassword(_password);

			// random string to use as email validation token
			var randomBytesBuf = this.crypto.randomBytes(16);
			var validationString = randomBytesBuf.toString('hex');

			// create user document
			var now = new Date().valueOf();
			var userDoc = {
				encEmail: helpers.enc(_email),
				hashPassword: hashedPassword, 
				created_at: now,
				verified_email: false
			}

			// connect to db
			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
				if(err){
					return reject({error: "couldn't connect to mongodb", details:err});
				}

				// check email not taken
				var query = {email:userDoc.encEmail};
				db.collection("users").find(query).toArray((err, docs)=>{
					if(err){
						db.close();
						return reject({error: "error looking up email", details:err});
					}

					if(docs.length!=0){
						db.close();
						return reject({error: "this email is in use", details:{email:_email}});	
					}

					// insert doc
					db.collection("users").insertOne(userDoc)
					.then((res)=>{
						if(res.result.n==1){

							// attempt to send email
							if(process.env.APP_DEBUG=="true"){
								console.log("attempt to send email");
							}


						}else{
							return reject({ error: "failed to add user to db" });
						}
					},(err)=>{
						db.close();
						return reject({error: "error inserting new doc", details:err});	
					});

				});
			});
		});
	};// signup end

}