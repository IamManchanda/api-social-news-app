import { MyContext } from "src/types";
import { Query, Mutation, Resolver, Arg, Ctx } from "type-graphql";
import { User } from "../entities/user";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME } from "../constants";
import { RegisterOptions } from "../entities/lib/register-options";
import { LoginOptions } from "../entities/lib/login-options";
import { UserResponse } from "../entities/lib/user-response";
import { validateRegisteredUser } from "../utils/validate-registered-user";

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
    @Arg("options", () => RegisterOptions)
    options: RegisterOptions,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const errors = validateRegisteredUser(options);
    if (errors) return { errors };

    const { email, username, password: plainPassword } = options;
    const password = await argon2.hash(plainPassword);

    let user;
    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          email,
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
    @Arg("options", () => LoginOptions)
    options: LoginOptions,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const { usernameOrEmail, password: plainPassword } = options;
    const user = await em.findOne(
      User,
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail },
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "username or email doesn't exist",
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

  @Mutation(() => Boolean)
  async forgotPassword(@Arg("email") email: string, @Ctx() { em }: MyContext) {
    const user = await em.findOne(User, { email });
    console.log({ user });
    return true;
  }
}
