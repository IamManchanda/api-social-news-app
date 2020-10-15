import { MyContext } from "src/types";
import {
  InputType,
  Mutation,
  Resolver,
  Field,
  Arg,
  Ctx,
  ObjectType,
} from "type-graphql";
import { User } from "../entities/user";
import argon2 from "argon2";

@InputType()
class UsernamePasswordOptions {
  @Field(() => String)
  username: string;

  @Field(() => String)
  password: string;
}

@ObjectType()
class FieldError {
  @Field(() => String)
  field: string;

  @Field(() => String)
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async register(
    @Arg("options", () => UsernamePasswordOptions)
    options: UsernamePasswordOptions,
    @Ctx() { em }: MyContext,
  ) {
    const { username, password: plainPassword } = options;
    const password = await argon2.hash(plainPassword);
    const user = em.create(User, { username, password });
    await em.persistAndFlush(user);
    return user;
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options", () => UsernamePasswordOptions)
    options: UsernamePasswordOptions,
    @Ctx() { em }: MyContext,
  ): Promise<UserResponse> {
    const { username, password: plainPassword } = options;
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "username doesn't exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, plainPassword);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }
    return { user };
  }
}
