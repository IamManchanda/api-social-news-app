import { Field, ObjectType } from "type-graphql";
import { Post } from "../entities/post";

@ObjectType()
export class PaginatedPostsResponse {
  @Field(() => [Post])
  posts: Post[];

  @Field(() => Boolean)
  hasMore: boolean;
}
