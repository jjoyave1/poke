const express = require('express');
const https = require('https');

const app = express();

const PORT = 8000;
const ENDPOINT = 'https://pokeapi.co/api/v2/pokemon/';
const POKEMON_NUMBERS = [1, 2, 3, 4, 5];

let GLOBAL_BODY = [];


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
                GLOBAL_BODY.push(requiredData);
                requestCount++;

                if (requestCount === maxRequests) {
                    // requests complete, make calculations and sort
                    GLOBAL_BODY.sort(sortByName);

                    let body = {
                        pokemon: GLOBAL_BODY,
                        averages: generateAverages(GLOBAL_BODY)
                    };
                    response.write(JSON.stringify(body));
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
    generateBaseData(POKEMON_NUMBERS, res);
});

//helpers

function sortByName(a, b) {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) {
        return -1;
    }
    if (nameA > nameB) {
        return 1;
    }
    return 0;
}

/**
 * @function generateAverages
 * @param {object[]} pokemon 
 */
function generateAverages(pokemon) {
    //[{"name":"hp","stat":45},{"name":"attack","stat":49},{"name":"defense","stat":49},{"name":"special-attack","stat":65},{"name":"special-defense","stat":65},{"name":"speed","stat":45}]
    const averages = [];
    const numberOfMons = pokemon.length;

    for (let i = 0; i < numberOfMons; i++) {
        const singleMon = pokemon[i];
        const singleMonStats = singleMon.stats;

        for (let j = 0, jLen = singleMonStats.length; j < jLen; j++) {
            const stat = singleMonStats[i];
            if (averages.filter(item => item.name === stat.name).length > 0) {
                const name = stat.name;
                const value = stat.stat;
                const itemIndex = averages.findIndex(item => item.name === name);
                averages[itemIndex].stat += value;
            } else {
                averages.push(stat);
            }

        }
    }

    averages.map(item => item.stat = item.stat/numberOfMons);
    return averages;
}
