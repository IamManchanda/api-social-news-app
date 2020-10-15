import { MikroORM } from "@mikro-orm/core";
import mikroOrmConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";

const main = async () => {
  /* Database Server Connect */
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  /* API Server */
  const app = express();
  const port = 4000;
  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver],
      validate: false,
    }),
  });
  server.applyMiddleware({ app });
  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
