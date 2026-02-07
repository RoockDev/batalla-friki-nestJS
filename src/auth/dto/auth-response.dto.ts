export class AuthUserDto {
  id!: number;
  email!: string;
  level!: number;
  xp!: number;
  wins!: number;
  losses!: number;
  roles!: string[];
}

export class AuthResponseDto {
  access_token!: string;
  user!: AuthUserDto;
}
