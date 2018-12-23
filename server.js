
const path = require('path');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
app.use(express.json());
const uuid = require('uuid/v4')
const session = require('express-session');

app.use(session({
    genid: function (req) {
        return uuid() // use UUIDs for session IDs
    },
    secret: 'Password'
}))

/////////////////////////////////////////////
// Logger & configuration
function logger(req, res, next) {
    console.log(req.method, req.url);
    next();
}
app.use(logger);
/////////////////////////////////////////////

// grabs random data from from mlab data base

app.get("/", (request, response) => {
    console.log("s")
    db.collection('datas')
        .aggregate([{ $sample: { size: 1 } }])
        .toArray((err, results) => {
            if (err) throw err;
            response.json(results);   
        });
});


//adds data to mlab db
app.post('/data/', (request) => {
   
    const data = request.body;
    let mods = [];
    for (let item of data['businesses']) {
        item.liked = false;
        item.session = request.sessionID;
        mods.push(item);
    }

    db.collection("datas").insertMany(mods, (err) => {
        if (err) throw err;
        console.log("success it works")
    })

});

//updates db for items swiped right(good)
app.post("/change/",(request,response)=>{
    console.log("are you entering?")
    let info = request.body;
    let idString = info['id']; 
    db.collection("datas").update({"id":idString}, {$set:{"liked":true}})
    console.log("finished!")
    response.json("this is to end the post")

})
// return list of all items with liked == true
app.get("/truevalues/",(request,response)=>{
    db.collection('datas')
        //.find({"liked":true })
        .aggregate([
            {$match: { "liked": true }},
            {$sample: { size: 1 } },
        ])
        .toArray((err, results) => {
            if (err) throw err;
            response.json(results);

        });
});





/////////////////////////////////////////////
// Boilerplate, no need to touch what's below

// For production, handle any requests that don't match the ones above
app.use(express.static(path.join(__dirname, 'client/build')));

// Wild-card, so handle everything else
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/client/build/index.html'));
});


// Set up configuration variables
if (!process.env.MONGODB_URI) {
    console.log('- Error - Must specify the following env variables:');
    console.log("MONGODB_URI='mongodb://someUser:somePassword@something.com:1234/someDatabaseName'");
    console.log('- Consider putting into .env.local');
    process.exit(1);
}

const MONGODB_URL = process.env.MONGODB_URI;
const splitUrl = MONGODB_URL.split('/');
const mongoDbDatabaseName = splitUrl[splitUrl.length - 1];

let db;
// Connect to the MongoDB
MongoClient.connect(MONGODB_URL, { useNewUrlParser: true }, (err, client) => {
    if (err) throw err;
    console.log("--MongoDB connection successful");
    db = client.db(mongoDbDatabaseName);

    // Start the server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`
      *********************************************
      * Insecure prototyping backend is running!  *
      * Only use for prototyping                  *
      * Backend server up at ${PORT}              *
      *********************************************
    `);
    })
});
