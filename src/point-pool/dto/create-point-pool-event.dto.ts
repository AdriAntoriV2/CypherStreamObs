import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePointPoolEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}