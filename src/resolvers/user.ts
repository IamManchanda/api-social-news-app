import { MyContext } from "src/types";
import { Query, Mutation, Resolver, Arg, Ctx } from "type-graphql";
import { User } from "../entities/user";
import argon2 from "argon2";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { RegisterOptions } from "../dto/register-options";
import { LoginOptions } from "../dto/login-options";
import { UserResponse } from "../lib/user-response";
import { validateRegisteredUser } from "../utils/validate-registered-user";
import { sendEmail } from "../utils/send-email";
import { v4 as uuidv4 } from "uuid";
import { getConnection } from "typeorm";

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext): Promise<User | undefined> | null {
    if (!req.session.userId) return null;
    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => RegisterOptions)
    options: RegisterOptions,
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const errors = validateRegisteredUser(options);
    if (errors) return { errors };

    const { email, username, password: plainPassword } = options;
    const password = await argon2.hash(plainPassword);

    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email,
          username,
          password,
        })
        .returning("*")
        .execute();

      // user = await User.create({ email, username, password }).save();
      user = result.raw[0];
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "Username already exists",
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
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const { usernameOrEmail, password: plainPassword } = options;
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } },
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "Username or Email doesn't exist",
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
            message: "Incorrect Password",
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
          resolve(false);
        } else {
          resolve(true);
        }
      }),
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext,
  ): Promise<boolean> {
    const user = await User.findOne({ where: { email } });

    // for security reasons, don't tell user anything and just return true
    if (!user) return true;

    const token = uuidv4();
    await redis.set(
      `${FORGOT_PASSWORD_PREFIX}${token}`,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3, // 3 Days
    );
    await sendEmail({
      to: email,
      subject: "Reset Password!",
      html: `
          <p>
            Please visit this link to <a href="${process.env.RESET_PASSWORD_LINK}/${token}">Reset Password</a>
          </p>
        `,
    });
    return true;
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext,
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "New Password length must be greater than 3",
          },
        ],
      };
    }

    const key = `${FORGOT_PASSWORD_PREFIX}${token}`;

    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "The Reset Password token has expired",
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) },
    );

    await redis.del(key);
    req.session.userId = user.id;
    return { user };
  }
}
