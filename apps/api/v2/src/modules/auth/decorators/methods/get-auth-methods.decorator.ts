import { AuthMethods } from "@/lib/enums/auth-methods";
import { createParamDecorator } from "@nestjs/common";

export const GetAuthMethod = createParamDecorator<unknown, AuthMethods>((_data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const authMethod = request.authMethod as AuthMethods;

  if (!authMethod) {
    throw new Error("GetAuthMethod decorator : auth method not set");
  }

  return authMethod;
});
