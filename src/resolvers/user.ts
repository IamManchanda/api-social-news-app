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
  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UsernamePasswordOptions)
    options: UsernamePasswordOptions,
    @Ctx() { em }: MyContext,
  ): Promise<UserResponse> {
    const { username, password: plainPassword } = options;

    if (username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "username length must be greater than 2",
          },
        ],
      };
    }

    if (plainPassword.length <= 3) {
      return {
        errors: [
          {
            field: "password",
            message: "password length must be greater than 3",
          },
        ],
      };
    }

    const password = await argon2.hash(plainPassword);
    const user = em.create(User, { username, password });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "username already exists",
            },
          ],
        };
      }
    }

    return { user };
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
