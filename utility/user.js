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

	this.attemptEmailVerification = (_verificationtoken)=>{
		return new Promise((resolve, reject)=>{

			// connect to db
			// connect to db
			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
				if(err){
					return reject({error: "couldn't connect to mongodb", details:err});
				}

				// search and update if exists
				var query = {
					verified_email_token: _verificationtoken,
					verified_email: false
				}
				var update = {
					$set: {
						verified_email: true,
						verified_email_token: false,
					}
				}
				
				db.collection("users").findOneAndUpdate(query, update, {returnOriginal: false}, (err, result)=>{
					
					if(err){
						db.close();
						return reject({error:"error in update", details:err});
					}

					if(process.env.APP_DEBUG=="true"){
						console.log("result", result);
						console.log("query", query);
					}

					if(result.ok){
						db.close();

						if(result.lastErrorObject.updatedExisting){
							return resolve({success:"email is now verified"});
						}else{
							return reject({error:"couldn't find document with this token", details:{token:_verificationtoken}});
						}
						
					}
			
					db.close();
					return reject({error: "findOneAndUpdate failed", details: result});

				});// find end

			});// connect end

		});
	}; // this.attemptEmailVerification end

	this.sendVerifyEmail = (_userdoc)=>{
		return new Promise((resolve, reject)=>{
			if(process.env.APP_DEBUG=="true"){
				console.log("in sendVerifyEmail");
			}

			if(_userdoc.verified_email){
				// email already verified
				return reject({error: "email is already verified"});
			}else{

				var to = helpers.dec(_userdoc.encEmail);
				var from = process.env.APP_EMAIL;
				var subject = "Verify you email for "+process.env.APP_NAME;

				helpers.template('email.verify_email', {verification_token: _userdoc.verified_email_token}).then((obj)=>{
					// helpers.template resolve
					var emailbody = obj.str;

					var verifyEmail = new emailer(to, from, subject, emailbody); // (_to, _from, _subject, _emailbody)
					verifyEmail.send().then((obj)=>{
						// emailer send resolve
						if(process.env.APP_DEBUG=="true"){
							console.log("verifyEmail.send sent");
							console.log(obj);
						}
						return resolve({success:"send verification email", details: obj});
					},(obj)=>{
						// emailer send reject
						if(process.env.APP_DEBUG=="true"){
							console.log("verifyEmail.send failed");
							console.log(obj);
						}
						return reject({error:"send verification emailfailed ", details: obj});
					})

				},(obj)=>{
					// helpers.template reject
					return reject({error: "couldn't render email template", details:obj});
				});
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
				verified_email: false,
				verified_email_token: validationString,
			}

			// connect to db
			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
				if(err){
					return reject({error: "couldn't connect to mongodb", details:err});
				}

				// check email not taken
				var query = {encEmail:userDoc.encEmail};
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

							this.sendVerifyEmail(userDoc).then((obj)=>{
								// this.sendVerifyEmail resolve
								db.close();
								return resolve(obj);
							},(obj)=>{
								// this.sendVerifyEmail reject
								db.close();
								return reject(obj);
							});


						}else{
							db.close();
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