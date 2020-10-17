import { InputType, Field } from "type-graphql";

@InputType()
export class LoginOptions {
  @Field(() => String)
  usernameOrEmail: string;

  @Field(() => String)
  password: string;
}
