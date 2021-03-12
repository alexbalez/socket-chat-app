const express = require('express')
const mongoose = require('mongoose')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const bodyParser= require('body-parser')

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use('/', express.static('node_modules'))

const Message = mongoose.model('Message', {
    from: String,
    room: String,
    message: String,
    time: Date
})

const uri = "xxx";

mongoose.connect(uri, {useUnifiedTopology:true, useNewUrlParser:true}, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log('mongodb connected')
    }
})

const server = http.listen(3030, () => {
    console.log('server listening on :', server.address().port)
})

app.get('/', (req, res) => {
    res.sendFile(__dirname+'/index.html')
})

app.post('/messages', (req, res) => {
    var msg = new Message()
    msg.from = req.body.user
    msg.room = req.body.room
    msg.message = req.body.message
    msg.time = Date.now()
    console.log(msg)
    msg.save()
})

app.post('/rooms/', (req, res) => {
    if(!req.body.room){
        //not logged in
        res.sendFile(__dirname+'/index.html')
    } else if (req.body.room=='covid'){
        res.sendFile(__dirname+'/covid.html')
    } else if (req.body.room=='news'){
        res.sendFile(__dirname+'/news.html')
    } else if (req.body.room=='nodeJS'){
        res.sendFile(__dirname+'/nodeJS.html') 
    } 
})

var users = {}
var ids = {}
var pattern = / ?@(\w+) ?/ // anything in the form of @\w+
    
io.on('connection', socket => {
    console.log('user', socket.id, 'connected')

    socket.on('sendmessage', msg => {

        found = msg.input.match(pattern)
        if(found){
            //direct messages include @. 
            console.log('private for',found[1])
            for (var value in users){
                if (found[1]===value){
                    io.to(ids[value]).emit('emitmessage', 'from '+msg.user+': '+msg.input);
                    socket.emit('emitmessage', 'to '+value+': '+msg.input) 
                    return; 
                } 
            }
            return;
        }

        io.in(users[msg.user]).emit('emitmessage', msg.user +': '+msg.input) 
        
        
    })
    
    socket.on('disconnect', () => {
        console.log(socket.id, 'disconnected')
        users[socket.id] = ''
    })

    socket.on('setuser', user => {
        console.log(user.user, 'is', socket.id, 'room', user.room)
        users[user.user] = user.room
        ids[user.user] = socket.id
        socket.join(user.room)
    })
})