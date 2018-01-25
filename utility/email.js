module.exports = function(_to, _from, _subject, _emailbody){
	this.to = _to;
	this.from = _from;
	this.subject = _subject;
	this.emailbody = _emailbody;
	this.https = (typeof https === "undefined" ? require('https') : https);
	this.options = {
			host: 'api.sendgrid.com',
			path: '/v3/mail/send',
			method: 'POST',
			headers: {
				'Authorization': 'Bearer '+process.env.SENDGRID_API_KEY,
				'Content-Type': 'application/json'
			}
		};

	this.send = ()=>{
		return new Promise((resolve, reject)=>{
			
			// data to post to sendgrid
			var postData = {
				"personalizations": [
					{
						"to": [
							{
								"email": this.to
							}
						],
						"subject": this.subject
					}
				],
				"from": {
					"email": this.from
				},
				"content": [
					{
						"type": "text/html",
						"value": this.emailbody
					}
				]
			};

			// connect
			var emailReq = this.https.request(this.options, (response)=>{
				this.statusCode = response.statusCode;
				this.headers = response.headers;
				this.messageID = response.headers["x-message-id"] || "";
				this.responseBody = ''
				response.on('data', function (chunk) {
					this.responseBody += chunk;
				});
				response.on('end', function () {
					emailReq.end();
					return resolve({success:"sendgrid accepted", details:{id: this.messageID, statuscode: this.statusCode, body: this.responseBody}});
				});
			});

			emailReq.on('error', (rre) => {
				return reject({error:"failed when sending to sendgrid", details:{statuscode: this.statusCode, body: this.responseBody}});
			});

			emailReq.write(JSON.stringify(postData));// write data
			emailReq.end();


		});
	};// send end
};