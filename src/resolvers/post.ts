import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/post";
import { PostOptions } from "../dto/post-options";
import { MyContext } from "../types";
import { isAuth } from "../middlewares/is-auth";
import { getConnection } from "typeorm";
import { PaginatedPostsResponse } from "../lib/paginated-posts-response";
import { Upvote } from "../entities/upvote";

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(
    @Arg("snippetLimit", () => Int) snippetLimit: number,
    @Root() root: Post,
  ) {
    const textLength = root.text.length;
    let textSnippet = root.text.slice(0, snippetLimit);
    return `${textSnippet}${textLength > snippetLimit ? "..." : ""}`;
  }

  @Query(() => PaginatedPostsResponse)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
  ): Promise<PaginatedPostsResponse> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
      SELECT 
        p.*,
        JSON_BUILD_OBJECT(
          'id', u.id,
          'email', u.email,
          'username', u.username,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) creator
      FROM post p
      INNER JOIN public.user u ON u.id = p."creatorId"
      ${cursor ? `WHERE p."createdAt" < $2` : ""}
      ORDER BY p."createdAt" DESC
      LIMIT $1
    `,
      replacements,
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  createPost(
    @Arg("options", () => PostOptions) options: PostOptions,
    @Ctx() { req }: MyContext,
  ): Promise<Post> {
    return Post.create({
      ...options,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: true }) title: string,
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) return null;
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title });
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id", () => Int) id: number): Promise<boolean> {
    await Post.delete(id);
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext,
  ): Promise<boolean> {
    const isUpvote = value !== -1;
    const realValue = isUpvote ? 1 : -1;
    const { userId } = req.session;
    await getConnection().query(`
      START TRANSACTION;

      INSERT INTO upvote ("userId", "postId", value)
      VALUES (${userId},${postId},${value});
      
      UPDATE post
      SET points = points + ${realValue}
      WHERE id = ${postId};
      
      COMMIT;
    `);
    return true;
  }
}
