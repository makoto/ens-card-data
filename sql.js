const fs = require('fs').promises;
const namehash = require('@ensdomains/eth-ens-namehash')

async function main(){
    var csv = await fs.readFile("./data/data.csv", "utf8")
    csv = csv.split("\n")
    csv = csv.map((c) => c.split(","))    
    csv.shift()
    const doc = `
WITH ens_poapid_devcon6 AS (
SELECT *
FROM (
VALUES
${
    csv.map(c => {
        [id, poapId, name, address,createdAt,approvedAt,printedAt] = c  
        label = (name.match(/\.eth/) && name.split(".").length == 2) ?  `'${name.split(".")[0]}'` : 'null'
        node = namehash.hash(name)
        if(poapId){
            return `(${poapId}, '${createdAt}', '${address.toLowerCase()}','${name}', ${label}, '${node}', '${printedAt}')\n`
        }else{
            return null
        }
    }).filter(a => !!a)
}
) AS x (poap_id, created_at, address, name, label, node, printed_at)
)
select * from ens_poapid_devcon6;
`;
    
    console.log(doc)    
}
main()