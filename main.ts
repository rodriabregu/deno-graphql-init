import { Server } from 'https://deno.land/std@0.107.0/http/server.ts'
import { GraphQLHTTP } from 'https://deno.land/x/gql@1.1.0/mod.ts'
import { makeExecutableSchema } from 'https://deno.land/x/graphql_tools@0.0.2/mod.ts'
import { gql } from 'https://deno.land/x/graphql_tag@0.0.1/mod.ts'
import {
  Bson,
  MongoClient,
} from "https://deno.land/x/mongo@v0.29.2/mod.ts";

const typeDefs = gql`
  type Query {
    hello: String
    allPositions: [Position!]!
  }

  type Mutation {
    insertPosition(roleName: String!, customerName: String!, removeWorkAllowed: Boolean): Position!
  }

  type Position {
    _id: ID!
    role_name: String!
    customer_name: String!
    remote_work_allowed: Boolean
  }
`

// connect to the mongodb
const connect = async () => {
  const client = new MongoClient();
  
  await client.connect({
    db: "test",
    tls: true,
    servers: [
      {
        host: "cluster0-shard-00-02.wio6q.mongodb.net",
        port: 27017,
      },
    ],
    credential: {
      username: "root",
      password: "root",
      db: "test",
      mechanism: "SCRAM-SHA-1",
    },
  });
  
  return client
}

interface PositionSchema {
  _id: Bson.ObjectId;
  role_name: string;
  customer_name: string;
  remote_work_allowed: boolean;
}
// insert an object in db
const insertPosition = async (args: any) => {
  const client = await connect()
  const db = client.database("test");
  const positions = db.collection<PositionSchema>("positions");
  const insertId = await positions.insertOne({
    role_name: args.roleName,
    customer_name: args.customerName,
    remote_work_allowed: args.removeWorkAllowed,
  })
  return positions.findOne({ _id: insertId }, { noCursorTimeout: false })
}

// return the object
const allPositions = async () => {
  const client = await connect()
  const db = client.database("test");
  const positions = db.collection<PositionSchema>("positions");
  return positions.find({}, { noCursorTimeout: false }).toArray()
}

const resolvers = { 
  Query: { 
    hello: () => `Hello World!`,
    allPositions: () => allPositions(),
  },
  Mutation: {
    insertPosition: (_: any, args: any) => insertPosition(args)
  }
}

const s = new Server({
  handler: async (req) => {
    const { pathname } = new URL(req.url)

    return pathname === '/graphql'
      ? await GraphQLHTTP<Request>({
          schema: makeExecutableSchema({ resolvers, typeDefs }),
          graphiql: true
        })(req)
      : new Response('Not Found', { status: 404 })
  },
  addr: ':3000'
})

s.listenAndServe()