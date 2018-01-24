module.exports.dbtest = ()=>{
	return new Promise((resolve, reject)=>{

		// connect to local db
		mongo.MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
			if(err){
				return reject({error:err});
			}

			// create a users collection
			db.createCollection("users", (err,res)=>{
				if(err){throw err;}
				console.log(res);
				console.log("Collection created!");
				db.close();
				return resolve({success:res});
			});
		});

	});
}
