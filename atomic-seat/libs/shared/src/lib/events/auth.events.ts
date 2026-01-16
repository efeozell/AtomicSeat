export class AuthCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly username: string,
    public readonly role: string,
    public readonly createdAt: Date,
  ) {}
}

export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
  ) {}
}

export class UserDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly deletedAt: Date,
  ) {}
}
