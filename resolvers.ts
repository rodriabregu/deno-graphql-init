import { dotEnvConfig } from './deps.ts';
dotEnvConfig({ export: true });

import {
  Bson,
  MongoClient,
} from "https://deno.land/x/mongo@v0.29.2/mod.ts";
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
      username: Deno.env.get("DB_USER"),
      password: Deno.env.get("DB_PASSWORD"),
      db: Deno.env.get("DB_NAME"),
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

export const resolvers = { 
  Query: { 
    hello: () => `Hello World!`,
    allPositions: () => allPositions(),
  },
  Mutation: {
    insertPosition: (_: any, args: any) => insertPosition(args)
  }
}