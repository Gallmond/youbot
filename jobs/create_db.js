module.exports.create = ()=>{
	return new Promise((resolve, reject)=>{

		if(typeof mongo === "undefined"){
			mongo = require('mongodb');
		}

		var MongoClient = mongo.MongoClient;

		// connect 
		// MongoClient.connect(process.env.MONGO_URL, (err, db)=>{
		// 	if(err){
		// 		return reject({error:err});
		// 	}
		// 	// create a users collection
		// 	db.createCollection("users", (err,res)=>{
		// 		if(err){throw err;}
		// 		console.log(res);
		// 		console.log("Collection created!");
		// 		db.close();
		// 		return resolve({success:res});
		// 	});
		// });

		MongoClient.connect(process.env.MONGO_URL)
		.then((db)=>{

			db.createCollection("users")
			.then((res)=>{
				console.log(res);
				console.log("Collection created!");
				db.close();
				return resolve({success:res});
			},(err)=>{
				db.close();
				return reject({error:err}); 
			});

			
		},(err)=>{
			console.log(err);
			return reject({error:err});
		});


	});
}