
import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChatCommandDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Command name may contain only letters, numbers, and underscores',
  })
  @MinLength(1)
  @MaxLength(25)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  response!: string;

  @IsInt()
  @Min(0)
  cooldownSeconds = 0;
}
