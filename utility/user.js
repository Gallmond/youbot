module.exports = function(){
	this.crypto = (typeof crypto === "undefined" ? require('crypto') : crypto);
	this.mongo = (typeof mongo === "undefined" ? require('mongodb') : mongo);
	this.options = {
		password_reset_expires_seconds: (60*60*6) // 6 hours in seconds
	};

		
	
	this.generatePassword = (_plaintextpass)=>{
		var salt = this.crypto.randomBytes(16).toString('hex'); // 32 char as hex
		var derrivedKey = this.crypto.pbkdf2Sync(_plaintextpass, salt, 100000, 512, 'sha512');
		var hexDerrivedKey = derrivedKey.toString('hex');
		return salt+""+hexDerrivedKey;
	};// generatePassword
	

	this.comparePassword = (_plainTextPass, _hashedPass)=>{
		// get salt off
		var saltPart = _hashedPass.substring(0,32);
		var nonSaltPart = _hashedPass.substring(32);

		// re-generate the pass
		var derrivedKey = this.crypto.pbkdf2Sync(_plainTextPass, saltPart, 100000, 512, 'sha512');
		var hexDerrivedKey = derrivedKey.toString('hex');
		var passOutput = saltPart+""+hexDerrivedKey;

		if(debug){
			console.log("_plainTextPass:", _plainTextPass);
			console.log("passOutput:", passOutput);
			console.log("_hashedPass:", _hashedPass);
		}

		// does this match the passed-in hashedpass?
		if(passOutput === _hashedPass){
			return true;	
		}else{
			return false;
		}
	};// comparePassword

	
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

					if(debug){
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
	}; // this.attemptEmailVerification

	
	this.sendVerifyEmail = (_userdoc)=>{
		return new Promise((resolve, reject)=>{
			if(debug){
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
						if(debug){
							console.log("verifyEmail.send sent");
							console.log(obj);
						}
						return resolve({success:"send verification email", details: obj});
					},(obj)=>{
						// emailer send reject
						if(debug){
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
	};// sendVerifyEmail
	
	
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
							if(debug){
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
	};// signup

	
	this.login = (_email, _password)=>{
		return new Promise((resolve, reject)=>{

			ssn.logged_in = false;
			var encEmail = helpers.enc(_email);

			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
				if(err){
					return reject({error: "couldn't connect to mongodb", details:err});
				}

				// find row with this email
				var query = {encEmail:encEmail};
				db.collection("users").find(query).toArray((err, docs)=>{
					if(err){
						db.close();
						return reject({error: "error looking up email", details:err});
					}

					if(docs.length==1){

						// compare the passes
						if(!this.comparePassword(_password, docs[0].hashPassword)){
							db.close();
							return reject({error: "password is incorrect"});
						}else{

							// log in and update 
							ssn.logged_in = true;

							// search and update if exists
							var query = {
								_id: new mongo.ObjectId(docs[0]._id)
							}
							var now = new Date().valueOf();
							var update = {
								$set: {
									last_login: now
								}
							}
							
							db.collection("users").findOneAndUpdate(query, update, {returnOriginal: false}, (err, result)=>{
								if(err){
									db.close();
									return reject({error: "error in findOneAndUpdate", details:err});
								}
								if(result.ok){
									db.close();

									if(result.lastErrorObject.updatedExisting){
										return resolve({success:"logged in"});
									}else{
										return reject({error:"error attempting to update last_login"});
									}
									
								}

							});// findone and update end
							// log in and update end

						}


					}else{
						db.close();
						return reject({error: "no account with this email"});	
					}
				});// find end


			});// connect end

		});
	};// login


	this.requestPasswordResetToken = (_email)=>{
		return new Promise((resolve, reject)=>{

			if(!helpers.valid.email(_email)){
				return reject({error:"this is not a valid email address"});
			}

			// connect
			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{

				if(err){
					db.close();
					return reject({error:"error trying to connect to db", details:err});
				}

				// find and update
				var reset_token = helpers.randomString(32);
				var now = new Date().valueOf();
				var query = {
					encEmail: helpers.enc(_email)
				}
				var update = {
					$set:{
						password_reset_token: reset_token,
						password_reset_token_created: now
					}
				}
				db.collection("users").findOneAndUpdate(query, update, {returnOriginal: false}, (err, result)=>{
					
					if(err){
						db.close();
						return reject({error:"error in update", details:err});
					}

					if(result.ok){
						db.close();

						if(result.lastErrorObject.updatedExisting){
							
							// SEND EMAIL
							helpers.template('email.reset_password_email', {password_reset_token:reset_token}).then((obj)=>{
								// template return resolved
								var emailbody = obj.str;
								var to = _email;
								var from = process.env.APP_EMAIL;
								var subject = "Reset your password";
								var passwordResetEmail = new emailer(to, from, subject, emailbody);
								passwordResetEmail.send().then((obj)=>{
									// email send resolve
									return resolve({success:"password reset email was sent", details:obj});
								},(obj)=>{
									// email send rejected
									return reject({error: "email failed to send", details:obj});
								});

							},(obj)=>{
								// template return rejected
								return reject({error: "couldn't get email string", details:obj});
							});


						}else{
							return reject({error: "could not find user doc with this email"});
						}
						
					}else{
						db.close();
						return reject({error: "findOneAndUpdate failed", details: result});
					}

				});
				// find and update end

			});// connect end

			

		});
	}; // requestPasswordResetToken


	this.checkPasswordResetTokenValidity = (_token)=>{ // returns token in resolve obj if successful
		return new Promise((resolve, reject)=>{

			// connect
			this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
				if(err){
					db.close();
					return reject({error:"error trying to connect to db", details:err});
				}

				// check token exists in timeframe
				var now = new Date().valueOf();
				var invalid_after = now-this.options.password_reset_expires_seconds*1000;

				var query = {
					password_reset_token: _token,
					password_reset_token_created: { $gt: invalid_after }
				}

				if(debug){
					console.log("query", query);
				}

				db.collection("users").find(query).toArray((err, docs)=>{
					db.close();
					
					if(err){
						return reject({error:"error trying to connect to db", details:err});
					}

					if(docs.length==0){
						return reject({error: "no account with this valid token"});
					}else if(docs.length==1){
						// token exists and is valid, forward onto form
						return resolve({success:"token is valid", token:docs[0].password_reset_token, _id:docs[0]._id});
					}else{
						return reject({error:"found more than one doc with this token???"});
					}
				});// find end
			});// connect end
		});
	};// checkPasswordResetTokenValidity


	this.resetPassword = (_token, _newPlainTextPassword)=>{
		return new Promise((resolve, reject)=>{

			var token = _token;
			var newPlainTextPassword = _newPlainTextPassword;

			// doublecheck validity (and get token)
			this.checkPasswordResetTokenValidity(token).then((obj)=>{
				// checPasswordResetTokenValidity resolve

				// generate new password
				var newPassword = this.generatePassword(newPlainTextPassword);

				// update user doc
				var update = {
					$set: {
						hashPassword: newPassword,
					},
					$unset: {
						verified_email_token: "",
						password_reset_token_created: ""
					}
				}

				var query = {
					_id: new this.mongo.ObjectId(obj._id)
				}

				// connect
				this.mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
					if(err){
						db.close();
						return reject({error:"error trying to connect to db", details:err});
					}

					db.collection("users").findOneAndUpdate(query, update, {returnOriginal: false}, (err, result)=>{
						
						if(err){
							db.close();
							return reject({error:"error in update", details:err});
						}

						if(result.ok){
							db.close();

							if(result.lastErrorObject.updatedExisting){
								return resolve({success:"password was updated"});
							}else{
								return reject({error:"couldn't find document with this id"});
							}
							
						}
					});// find and update end

				});// connect end

			},(obj)=>{
				// checPasswordResetTokenValidity reject
				return reject({error:"token is invalid", details: obj});
			})

		});
	};// resetPassword

}