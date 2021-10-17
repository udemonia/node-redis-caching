const express = require('express')
const axios = require('axios')
const chalk = require('chalk')
const redis = require('redis')
const { application } = require('express')
const PORT = process.env.PORT || 5000
const REDIS_PORT = process.env.REDIS_PORT || 6379

const client = redis.createClient(REDIS_PORT);
const app = express();

function setResponse(username, repos) {
    return `<h2>${username} has ${repos} public Github repos</h2>`
}

//* CACHE MIDDLEWARE

function cache(req,res,next) {
    //* pull out the username from the request param
    const { username } = req.params;

    //? functional equivalent of redis-cli get udemoina

    //? we're attempting to pull out the cache data from Redis
    client.get(username, (err, data) => {
        if (err) throw err;
        //* if there is data, respond with it - holding it for 3600 seconds
        if (data) {
            res.send(setResponse(username, data))
        } else {
            //* if there is no data - we will call next, which would be a non cached call
            next();
        }
    })

}

//? Make req to github for data
const getRepos = async (req,res,next) => {
    try {
        console.log(`fetching data`)
        let { username } = req.params
        const response = await axios.get(`https://api.github.com/users/${username}`)
        const repos = response.data.public_repos

        //* set data w/ redis - setEx = set with expiration
        //* key, time, data to cache
        client.setex(username, 3600, repos)

        res.send(setResponse(username, repos))
    } catch (error) {
        console.log('error')
        res.status(500)
    }
}

app.get('/repos/:username', cache, getRepos)

app.listen(PORT, () => {
    console.log(chalk.red.bold(`Listening on port: ${PORT}`))
})