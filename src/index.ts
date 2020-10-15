import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import mikroOrmConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  /* Database Server Connect */
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  /* API Server */
  const app = express();
  const host = "http://localhost";
  const port = 4000;
  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
  });
  server.applyMiddleware({ app, path: "/" });
  app.listen(port, () => {
    console.log(`Server started on port ${host}:${port}${server.graphqlPath}`);
  });
};

main();
