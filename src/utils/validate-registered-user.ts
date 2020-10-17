import { RegisterOptions } from "../lib/register-options";

export const validateRegisteredUser = (options: RegisterOptions) => {
  const { email, username, password: plainPassword } = options;

  if (!email.includes("@")) {
    return [
      {
        field: "email",
        message: "Invalid Email",
      },
    ];
  }

  if (username.length <= 2) {
    return [
      {
        field: "username",
        message: "Username length must be greater than 2",
      },
    ];
  }

  if (username.includes("@")) {
    return [
      {
        field: "username",
        message: "Username cannot include an @ sign",
      },
    ];
  }

  if (plainPassword.length <= 3) {
    return [
      {
        field: "password",
        message: "Password length must be greater than 3",
      },
    ];
  }

  return null;
};
