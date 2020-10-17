import { InputType, Field } from "type-graphql";

@InputType()
export class RegisterOptions {
  @Field(() => String)
  email: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  password: string;
}
