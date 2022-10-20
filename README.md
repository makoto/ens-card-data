# ENS card data

This repo contains data about ENS POAP cards at Devcon6

## Data

- data/data.csv = contains `id,poapId,name,address,createdAt,approvedAt,printedAt`
- data/tokens.csv = contains `tokenid, ownerId, eventId , created`

There are other data used to generate some charts

- data/nodes.csv & data/edge.csv is for https://public.flourish.studio/story/1717026/
- data/racechart.csv is for https://public.flourish.studio/visualisation/11522578/

## Scripts

- sql.js generates [Dune spellbook](https://github.com/duneanalytics/spellbook/pull/1806/files). The dashboard is at https://dune.com/makoto/ens-poap-devcon6
- graph.js generates various stats used to write ENS blog post (to be published)