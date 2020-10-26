import "reflect-metadata";
import "dotenv-safe/config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { __prod__, COOKIE_NAME } from "./constants";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/post";
import { User } from "./entities/user";
import path from "path";
import { Upvote } from "./entities/upvote";
import { createUserLoader } from "./utils/create-user-loader";
import { createUpvoteLoader } from "./utils/create-upvote-loader";

const main = async () => {
  /* Environment Variables */
  const {
    DATABASE_URL,
    REDIS_URL,
    PORT,
    SESSION_SECRET,
    CORS_ORIGIN,
  } = process.env;

  /* Database Server Connection with ORM */
  const conn = await createConnection({
    type: "postgres",
    url: DATABASE_URL,
    logging: true,
    // synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Upvote],
  });
  await conn.runMigrations();

  /* API & Caching Server */
  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis(REDIS_URL);
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
        domain: __prod__ ? ".web-social-news-app.vercel.app" : undefined,
      },
      saveUninitialized: false,
      secret: SESSION_SECRET as string,
      resave: false,
    }),
  );
  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      upvoteLoader: createUpvoteLoader(),
    }),
  });
  server.applyMiddleware({ app, path: "/", cors: false });

  const port = parseInt(PORT);
  app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
  });
};

main();
