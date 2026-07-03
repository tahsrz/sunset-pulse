import { UserWithProfile } from "@/modules/users/users.repository";

export class BaseStrategy {
  success!: (user: unknown) => void;
  error!: (error: Error) => void;

  validate(user: unknown): unknown {
    return user;
  }
}

export class NextAuthPassportStrategy {
  success!: (user: UserWithProfile) => void;
  error!: (error: Error) => void;

  validate(user: UserWithProfile): UserWithProfile {
    return user;
  }
}
