const express = require('express');
const https = require('https');

const app = express();

const PORT = 8000;
const ENDPOINT = 'https://pokeapi.co/api/v2/pokemon/';
const POKEMON_NUMBERS = [1, 2, 3, 4, 5];


/**
 * @function generateBaseData
 * @description takes in an array of pokemon IDs, fetches base info and concats into a payload
 * @param {number[]} idArray, @param {nodeResponse} response
 */

function generateBaseData(idArray, masterResponse) {
    let requestCount = 0;
    for (let i = 0, iLen = idArray.length; i < iLen; i++) {
        //close thread once last write resolves
        const maxRequests = iLen;
        getPokemon(idArray[i], masterResponse, maxRequests);
    }

    // get data for single poke by id
    function getPokemon(id, response, maxRequests) {
        https.get(`${ENDPOINT}${id}`, (resp) => {
            let data = '';
            resp.on('data', (partial) => data += partial);
            resp.on('end', () => {
                const requiredData = {};
                const rawData = JSON.parse(data);
    
                requiredData.name = rawData.name;
                requiredData.stats = extractStats(rawData);
                response.write(JSON.stringify(requiredData));
                requestCount++;

                if (requestCount !== maxRequests) {
                    response.write(',');
                } else {
                    response.write(']');
                    response.end();
                }
                return;
            });

        }).end();

        // filter out only the data we want
        function extractStats(data) {
            const statsArray = [];
            const rawStats = data.stats;
    
            for (let i = 0, iLen = rawStats.length; i < iLen; i++) {
                statsArray.push({
                    name: data.stats[i].stat.name,
                    stat: data.stats[i].base_stat
                });
            }
            return statsArray;
        }
    }
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/data', (req, res, next) => {
    res.write('[');
    generateBaseData(POKEMON_NUMBERS, res);
});