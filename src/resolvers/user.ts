import { MyContext } from "src/types";
import { InputType, Mutation, Resolver, Field, Arg, Ctx } from "type-graphql";
import { User } from "../entities/user";
import argon2 from "argon2";

@InputType()
class UsernamePasswordOptions {
  @Field(() => String)
  username: string;

  @Field(() => String)
  password: string;
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
}
