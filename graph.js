const fs = require('fs').promises;
const moment = require('moment');
const gr = require('graphql-request')
const { request, gql } = gr
let skip = 0
let pagination = 1000
const query = gql`
  query getTokens($eventIds: [String], $skip: Int){
    tokens(where:{
      event_in:$eventIds
    }, first:${pagination}, skip:$skip) {
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
  let totalTokens = 0
  let data
  var csv = await fs.readFile("bquxjob_56be86f2_183e85a52e1.csv", "utf8")
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
//   console.log(3, {eventIds})
  do {
    data = await request(url, query, {eventIds, skip})
    console.log({skip})
    data.tokens.forEach(d => {
      const {id, owner, event, created } = d
      const mintor = events[event.id]
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
    })
    totalTokens=totalTokens+data.tokens.length
    skip=skip+pagination
  } while (data.tokens.length === pagination && skip <= 2000);
  console.log("fetched", data.tokens.length, totalTokens)
  console.log(Object.keys(collectorAddress).length + 'ppl claimed ' + totalTokens + '  ENS POAPs')
  
  const leaderboard = Object.keys(collectorAddress).map(k => [k,collectorAddress[k]]).sort((a,b) => b[1].length - a[1].length)
//   console.log({mintorAddress})
  const mintorboard = Object.keys(mintorAddress).map(k => [k,mintorAddress[k]]).sort((a,b) => b[1].length - a[1].length)
//   const leaderboard = Object.keys(collectorAddress).map(k => [k,collectorAddress[k]]).sort((a,b) => b[1] - a[1]).slice(0,10)
  console.log('leaderboard')
  var nodes = leaderboard.map(l => {
    var user = addresses[l[0]] || l[0].slice(0,5)
    return [user, l[1].length]
  })
  var edges = []
  leaderboard.slice(0,20).map(l => {
    var [a, c] = l
    var user = addresses[a] || a.slice(0,5)
    console.log(user, c.length)
    c.map(cc => {
        edges.push([user,cc.name, cc.created])
        // console.log([user, cc].join(','))
    })
  })
  console.log('issuer leaderboard')
  mintorboard.slice(0,20).map(l => {
    console.log(l)
    var [a, c] = l
    var user = addresses[a] || a.slice(0,5)
    console.log(user, c.length)
    // c.map(cc => {
    //     edges.push([user,cc.name, cc.created])
    //     // console.log([user, cc].join(','))
    // })
  })

  await fs.writeFile("./nodes.csv", nodes.map(n => n.join(',') ).join('\r\n') )
  await fs.writeFile("./edges.csv", edges.map(e => e.join(',') ).join('\r\n') )
//   console.log({nodes, edges})
}

main()

// address, ENS name, number of tokens collected


// 1, [matoken.eth](https://app.poap.xyz/scan/matoken.eth), 30, 
// 2, [0x134f...](https://app.poap.xyz/scan/0x134f...), 20, 