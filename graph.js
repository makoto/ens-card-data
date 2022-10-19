const fs = require('fs').promises;
const moment = require('moment-timezone');
const gr = require('graphql-request')
const { request, gql } = gr
const _ = require('lodash')
const { providers } = require('ethers')
const ethers = require('ethers').ethers
console.log(2, process.env.INFURA_KEY)
if(!process.env.INFURA_KEY){
    throw("Set INFURA_KEY")
}
const providerUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
console.log(3)
const provider = new ethers.providers.JsonRpcProvider(providerUrl)

let pagination = 1000
const query = gql`
  query getTokens($eventIds: [String], $lastToken: Int){
    tokens(where:{
      event_in:$eventIds, 
      id_gt:$lastToken
    }, first:${pagination}, orderBy:id,orderDirection:asc, ) {
      id
      owner {
        id
      }
      event {
        id
      }
      created
    }
  }
`
const threashold = 25

const url = 'https://api.thegraph.com/subgraphs/name/poap-xyz/poap-xdai'
console.log(process.env.INFURA_KEY)
async function main(){
  const collectorAddress = {}
  const mintorAddress = {}
  const tokens = []
  let totalTokens = 0
  let lastToken = 0
  let data
  var csv = await fs.readFile("./data/data.csv", "utf8")

  csv = csv.split("\n")
  csv = csv.map((c) => c.split(","))
  var addresses = {}
  var events = {}
  csv.map(c => {
    var [id, poapId, name, address, createdAt,approvedAt,printedAt] = c
    if(!addresses[address.toLowerCase()]){
        addresses[address.toLowerCase()] = name
    }
    if(!events[poapId]){
        events[poapId] = name
    }
  })
eventIds = csv.map(c => c[1])
const attendedEventIds = new Set()

async function getUser(address, i){
    // Only fetch username for the top x
    if(!addresses[address] && i < threashold){
       try{        
        const name = await provider.lookupAddress(address)
        addresses[address] = name         
       }catch(e){
        console.log(address, e)
       }
    }
    return addresses[address] || address.slice(0,10)
}

let dataFile
  do {
    dataFile = `./data/poap_${lastToken}.json`
    try{
        await fs.access(dataFile)
        data = JSON.parse(await fs.readFile(dataFile, 'utf8'))
    }catch(e){
        data = await request(url, query, {eventIds, lastToken})
        await fs.writeFile(dataFile, JSON.stringify(data))
    }
    console.log({totalTokens,lastToken})
    data.tokens.forEach(d => {
      const {id, owner, event, created } = d
      const mintor = events[event.id]
      attendedEventIds.add(event.id)
      tokens.push([id, owner.id, event.id, created])
      var collection = {
        name: events[event.id],
        created: moment(new Date(parseInt(created) * 1000)).tz('America/Bogota').format("YYYY-MM-DD")
      }
      if(collectorAddress[owner.id]){
        collectorAddress[owner.id].push(collection)
      }else{
        collectorAddress[owner.id]= [collection]
      }
      var minting = {
        name: owner.id,
        created: moment(new Date(parseInt(created) * 1000)).tz('America/Bogota').format("YYYY-MM-DD")
      }
      if(mintorAddress[mintor]){
        mintorAddress[mintor].push(minting)
      }else{
        mintorAddress[mintor]= [minting]
      }
      lastToken=parseInt(id)
    })
    totalTokens=totalTokens+data.tokens.length    
  } while (data.tokens.length === pagination);

  console.log("fetched", data.tokens.length, totalTokens, lastToken)
  console.log(Object.keys(collectorAddress).length + 'ppl claimed ' + totalTokens + '  ENS POAPs')
  
  const leaderboard = Object.keys(collectorAddress).map(k => [k,collectorAddress[k]]).sort((a,b) => b[1].length - a[1].length)
  const mintorboard = Object.keys(mintorAddress).map(k => [k,mintorAddress[k]]).sort((a,b) => b[1].length - a[1].length)
  console.log('** leaderboard')
  const nodes = []
  var edges = []
  var timeseries = {}
  var topplayers = {}
  var totals = {}
  var race = {}
  for (let i = 0; i < leaderboard.length; i++) {
    const l = leaderboard[i];
    var [a, c] = l
    var user = await getUser(a, i)
    
    if(i < threashold) {
        console.log([i + 1, user, c.length].join('\t'))
        topplayers[user] = true
    }
    if(c.length > 1){
        nodes.push([user, c.length])
        c.map(cc => {
            edges.push([user,cc.name, cc.created])
            if(i < threashold) {
              if(timeseries[cc.created]){
                if(timeseries[cc.created][user]){
                  timeseries[cc.created][user]+=1
                }else{
                  timeseries[cc.created][user]=1
                }
              }else{
                timeseries[cc.created] = {
                  [user]:1
                }
              }
            }
        })    
    }
  }  
  Object.keys(topplayers).map(tp => {
    if(!totals[tp]) totals[tp]=0
    Object.keys(timeseries).map(ts => {
      totals[tp] = totals[tp] + (timeseries[ts][tp] || 0)
      if(race[tp]){
        race[tp][ts] = totals[tp]
      }else{
        race[tp] = {[ts]: totals[tp]}
      }
    })
  })
  console.log({race})
  var racechart = Object.keys(race).map(tp => {
    return [tp,...Object.values(race[tp])]
  })
  racechart.unshift(['player', ...Object.keys(race['matoken.eth'])])
  console.log('*** issuer leaderboard')
  var issueredges = []
  var issuernodes = []
  for (let i = 0; i < mintorboard.length; i++) {
    var l = mintorboard[i];
    var [a, c] = l
    if(i < threashold) console.log([i + 1, a, c.length].join('\t'))
    if(c.length > 1){
        for (let j = 0; j < c.length; j++) {
            const cc = c[j];
            var issuer = await getUser(a)
            var collector = await getUser(cc.name)
            issueredges.push([issuer,collector, cc.created])        
        }
        issuernodes.push([a, c.length])    
    }
  }


  const attendedEventIdsArray = Array.from(attendedEventIds)
  const noMints = _.difference(eventIds, attendedEventIdsArray)
  console.log(`${noMints.length} ppl did not issue any poaps`)
  await fs.writeFile("./data/racechart.csv", racechart.map(n => n.join(',') ).join('\r\n') )
  await fs.writeFile("./data/tokens.csv", tokens.map(n => n.join(',') ).join('\r\n') )
  await fs.writeFile("./data/nodes.csv", nodes.map(n => n.join(',') ).join('\r\n') )
  await fs.writeFile("./data/edges.csv", edges.map(e => e.join(',') ).join('\r\n') )
  await fs.writeFile("./data/issuernodes.csv", issuernodes.map(n => n.join(',') ).join('\r\n') )
  await fs.writeFile("./data/issueredges.csv", issueredges.map(e => e.join(',') ).join('\r\n') )
}

main()

// address, ENS name, number of tokens collected


// 1, [matoken.eth](https://app.poap.xyz/scan/matoken.eth), 30, 
// 2, [0x134f...](https://app.poap.xyz/scan/0x134f...), 20, 