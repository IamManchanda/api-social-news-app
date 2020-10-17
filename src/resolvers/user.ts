import { MyContext } from "src/types";
import {
  InputType,
  Query,
  Mutation,
  Resolver,
  Field,
  Arg,
  Ctx,
  ObjectType,
} from "type-graphql";
import { User } from "../entities/user";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME } from "../constants";

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
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    if (!req.session.userId) return null;
    const user = await em.findOne(User, {
      id: req.session.userId,
    });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UsernamePasswordOptions)
    options: UsernamePasswordOptions,
    @Ctx() { em, req }: MyContext,
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

    let user;
    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username,
          password,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      user = result[0];
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

    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options", () => UsernamePasswordOptions)
    options: UsernamePasswordOptions,
    @Ctx() { em, req }: MyContext,
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

    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve, _reject) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
        } else {
          resolve(true);
        }
      }),
    );
  }
}
