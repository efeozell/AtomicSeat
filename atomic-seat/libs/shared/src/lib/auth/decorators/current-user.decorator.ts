import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  <T = any>(data: unknown, ctx: ExecutionContext): T => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
