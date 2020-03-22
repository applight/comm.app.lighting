const express = require('express');

const client  = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();

app.post('/', (req, res) => {

    client.messages.create({from: '+19783879792',
			    to: '+16173345281',
			    body: 'node test'})
	.then( message => console.log( message.sid ));
    
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});
