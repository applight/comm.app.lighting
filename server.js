const app   = require('./index.js');
const https = require('https');

https.createServer(app).listen(process.env.PORT);

