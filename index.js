const express = require('express');

const client  = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();

app.post('/', (req, res) => {
    // create a test text message
    client.messages.create({from: '+19783879792',
			    to: '+16173345281',
			    body: 'node test'})
	.then( message => console.log( message.sid ));
    
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});

app.post('/call-avertest', (req, res) => {
    client.calls.create({
	callerId: '+19783879792',
	to: '+16173990190',
	record: 'true',
	recordStatusCallback: 'https://app.lighting/wireless/'
	
    });
});


// recordingStatusCallback target for REST API's call resource
app.post('/transcribe-recording', (req, res) => {
    var message = client.messages.create({
	from: '+18882001601',
	to: '+16173345281',
	body: req.body.transcriptionText
    });
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'message' : { 'sid' : ' " + message.sid + " ' }; };" );
});

// Send voice call transcript by SMS to me
// Used by plugin on twiml <Record> elements
app.post('/send-text-transcript', (req, res) => {
    // creates and sends a text with transcribed results  
    client.messages.create({from:'+19783879792',
			    to: '+16173345281',
			    body: req.body.results.text })
	.then( message => console.log( message.sid ));

    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{}" );
});
