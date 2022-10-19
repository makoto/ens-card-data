const fs = require('fs').promises;
const moment = require('moment');
const gr = require('graphql-request')
const { request, gql } = gr
const _ = require('lodash')
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
//   console.log({addresses})
//   var eventIds = csv.map(c => c[1]).slice(1,30)
eventIds = csv.map(c => c[1])
const attendedEventIds = new Set()
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
        created: moment(new Date(parseInt(created) * 1000)).format("YYYY-MM-DD")
      }
      if(collectorAddress[owner.id]){
        collectorAddress[owner.id].push(collection)
      }else{
        collectorAddress[owner.id]= [collection]
      }
      var minting = {
        name: owner.id,
        created: moment(new Date(parseInt(created) * 1000)).format("YYYY-MM-DD")
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
  var nodes = leaderboard.map(l => {
    var user = addresses[l[0]] || l[0].slice(0,5)
    return [user, l[1].length]
  })
  var edges = []
  leaderboard.map((l, i) => {
    var [a, c] = l
    var user = addresses[a] || a.slice(0,10)
    if(i < 11) console.log([i + 1, user, c.length].join('\t'))
    c.map(cc => {
        edges.push([user,cc.name, cc.created])
    })
  })
  console.log('*** issuer leaderboard')
  var issueredges = []
  var issuernodes = mintorboard.map((l, i) => {
    var [a, c] = l
    if(i < 11) console.log([i + 1, a, c.length].join('\t'))
    c.map(cc => {
        var issuer = addresses[a] || a.slice(0,10)
        var collector = addresses[cc.name] || cc.name.slice(0,10)
        issueredges.push([issuer,collector, cc.created])
    })
    return [a, c.length]
  })
  const attendedEventIdsArray = Array.from(attendedEventIds)
  console.log(eventIds.length, attendedEventIdsArray.length)
  const noMints = _.difference(eventIds, attendedEventIdsArray)
  console.log(noMints.length, noMints)
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