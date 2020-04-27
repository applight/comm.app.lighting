const express  = require('express');
const applight = require('./libapplight.js');
const client   = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const VoiceResponse     = require('twilio').twiml.VoiceResponse;
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const app               = express();

app.post('/', (req, res) => {
    // create a test text message
    client.messages.create({from: '+19783879792',
			    to: '+17818279675',
			    body: 'node test'})
	.then( message => console.log( message.sid ));
    
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});

app.post('/call-avertest', (req, res) => {
    var call = client.calls.create({
	callerId: '+19783879792',
	to: '+16173990190',
	record: 'true',
	recordStatusCallback: 'https://comm.app.lighting/wireless/send-text-transcript',
	twiml: '<Response><Dial callerId="+18882001601"><Number>+17818279675</Number></Dial></Response>'
    }).then( call => console.log(call.sid));
    
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'sid' : '" + call.sid  + "' };" );
});


// recordingStatusCallback target for REST API's call resource
app.post('/transcribe-recording', (req, res) => {
    var message = client.messages.create({
	from: '+18882001601',
	to: '+17818279675',
	body: req.body.transcriptionText
    }).then( message => console.log( message.sid ) );
    
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'message' : { 'sid' : ' " + message.sid + " ' }; };" );
});

// Send voice call transcript by SMS to me
// Used by plugin on twiml <Record> elements
app.post('/send-text-transcript', (req, res) => {
    // creates and sends a text with transcribed results  
    client.messages.create({from:'+19783879792',
			    to: '+17818279675',
			    body: req.body.results.text })
	.then( message => console.log( message.sid ));

    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{}" );
});


/* ***********************************************
** Primary App Lighting line 888 200 1601
**
** Should provide voicemail, appointment scheduling,
** and additional features for clients (me, d, whoev)
** who call in (like listening to voicemail, checking
** appointments, special dialing features
**
** *********************************************** */


// App Lighting's primary phone number (888) 200 - 1601
app.post('/primary-inbound', (req, res) => {

    const caller = req.body.From;

    var response = undefined;
    if ( applight.isClient(caller) ) {
	//response = clientResponse( caller );
	// while implementing regularResponse.. all callers are routed
	response = applight.vmScheduler.regularResponse();
    } else {
	response = applight.vmScheduler.regularResponse();
    }

    if ( response === undefined ) {
	throw new Error("'null' when 'Response' type expected");
    }

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
});



// branch for regular callers on App Lighting's
// primary phone number (888) 200 - 1601
app.post('/primary-choice', (req, res) => {
    var speech =  req.body.SpeechResult;
    var digits =  req.body.Digits;

    const response = new VoiceResponse();
    
    if ( typeof(speech) != 'undefined' ) {
	if ( speech.includes('appointment') ) 
	    digits = 1;
	else if ( speech.includes('message') )
	    digits = 2;
	else
	    digits = -1; // value to repeat input
    } else if ( typeof(digits) != 'undefined' ) {
	switch ( digits.parseInt() ) {
	case 1:
	    response.say('Not yet implemented. Goodbye');
	    break;
	case 2:
	    // TODO: a proper customize voicemail for each user...
	    // for now... minimum viable to get it to run
	    response.say('Please leave a message');
	    response.record({
		timeout: 30,
		transcribe: true
	    });
	    break;
	default:
	    response.say('You must choose from the available options');
	    response.redirect({ method: 'POST' }, '/primary-inbound');
	    break;
	}
    } else {
	throw new Error('Expected speechResult or digit to be set, both were undefined');
    }

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(response.toString());
    
});
