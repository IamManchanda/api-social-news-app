import { Field, ObjectType } from "type-graphql";
import { User } from "../user";
import { FieldError } from "./field-error";

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}
