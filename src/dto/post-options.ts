import { InputType, Field } from "type-graphql";

@InputType()
export class PostOptions {
  @Field(() => String)
  title: string;

  @Field(() => String)
  text: string;
}
