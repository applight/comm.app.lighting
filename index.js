const express  = require('express');
const applight = require('./libapplight.js');
const twilio   = require('twilio');
const client   = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VoiceResponse     = twilio.twiml.VoiceResponse;
const MessagingResponse = twilio.twiml.MessagingResponse;
const ClientCapability  = twilio.jwt.ClientCapability;
const app               = express();

const vaughan           = "+17818279675"

app.get('/token-voice', (request, response) => {
    const capability = new ClientCapability({
	accountSid: process.env.TWILIO_ACCOUNT_SID,
	authToken: process.env.TWILIO_AUTH_TOKEN
    });
    
    capability.addScope(new ClientCapability.OutgoingClientScope({
	applicationSid: process.env.TWILIO_TWIML_APP_SID}));
    
    const token = capability.toJwt();
    
  // Include token in a JSON response
    response.send({
	token: token
    });
});

app.post('/voice', (request, response) => {
    const voiceResponse = new VoiceResponse();
    voiceResponse.dial({
	callerId: '+18882001601',
    }, request.body.number);
    
    response.type('text/xml');
    response.send(voiceResponse.toString());
});

/*
app.post('/voice-token', (req, res) => {
    const IDENTITY = "the_user_id";

    // envirnment vars for REST CLIENT
    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;

    // envirnment vars for accessToken
    const TWIML_APPLICATION_SID = process.env.TWILIO_APPLICATION_SID;
    const API_KEY     = process.env.TWILIO_API_KEY;
    const API_SECRET  = process.env.TWILIO.API_SECRET;
    
    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    const accessToken = new AccessToken(ACCOUNT_SID,  API_KEY, API_SECRET);
    accessToken.identity = IDENTITY;
    const grant = new VoiceGrant({
	outgoingApplicationSid: TWIML_APPLICATION_SID,
	incomingAllow: true
    });
    accessToken.addGrant(grant);
    
    const response = new Twilio.Response();
    
    // Uncomment these lines for CORS support
    response.appendHeader('Access-Control-Allow-Origin', '*');
    response.appendHeader('Access-Control-Allow-Methods', 'GET');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.appendHeader("Content-Type", "application/json");
    response.setBody({
	identity: IDENTITY,
	token: accessToken.toJwt()
    });

    res.end(response.toString());
});
*/

app.post('/call-avertest', (req, res) => {
    var call = client.calls.create({
	callerId: '+19783879792',
	to: '+16173990190',
	record: 'true',
	recordStatusCallback: 'https://comm.app.lighting/send-text-transcript',
	twiml: '<Response><Dial callerId="+18882001601"><Number>' + vaughan + '</Number></Dial></Response>'
    }).then( call => console.log(call.sid));
    
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end( "{ 'sid' : '" + call.sid  + "' };" );
});


// recordingStatusCallback target for REST API's call resource
app.post('/transcribe-recording', (req, res) => {
    var message = client.messages.create({
	from: '+19783879792',
	to: vaughan,
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
			    to: vaughan,
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
	// response = clientResponse( caller );
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
