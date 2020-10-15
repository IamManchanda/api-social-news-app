import { Post } from "./entities/post";
import { __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { User } from "./entities/user";

const mikroOrmConfig = {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post, User],
  dbName: "social-news-db",
  type: "postgresql",
  debug: !__prod__,
  password: process.env.DATABASE_PASSWORD || "postgres",
} as Parameters<typeof MikroORM.init>[0];

export default mikroOrmConfig;
